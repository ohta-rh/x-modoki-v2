---
type: Research
title: "Garage v2.5 に、署名つき URL でブラウザから直接送った結果"
description: "Docker Compose の Garage v2.5.0 に、AWS SDK v3 の署名つき URL でブラウザから WebP を PUT し、公開の URL で読み出し、大きさの違い・期限切れ・別のオリジンが拒まれることを確かめた結果と設定。"
tags: [storage, media, spike]
status: stable
---

# Garage v2.5 に、署名つき URL でブラウザから直接送った結果

## 調査日: 2026-11-18

- issue: #11
- 捨てる場所のアプリ（Next.js 16.4.6 の本番のビルド、`http://localhost:3100`）から確かめた
- 結論: **ADR-0008 のまま Garage を使える。** SeaweedFS へ替える必要は無い。ただし AWS SDK の既定の checksum を止めないと、ブラウザからの PUT が全部失敗する（3.1）

## 1. 使った版

| もの | 版 |
|---|---|
| Garage | `dxflrs/garage:v2.5.0`（2026-10-24） |
| `@aws-sdk/client-s3` / `@aws-sdk/s3-request-presigner` | 3.1171.0 |
| ブラウザ | Google Chrome 157 |

## 2. 確かめたこと

| # | 確かめたこと | 結果 |
|---|---|---|
| 1 | Docker Compose で Garage が立ち上がり、スクリプト 1 本でバケットとキーができる | できた。スクリプトは 2 回流しても同じキーを返す（冪等） |
| 2 | 署名つき URL に、ブラウザの `fetch` から `image/webp` を PUT | 200 |
| 3 | 公開の URL（`http://xmodoki-media.web.garage.localhost:3902/<key>`）から GET | 200、`content-type: image/webp`。`<img>` で表示できた |
| 4 | 署名した大きさより 1 バイト大きく PUT | 403（署名が合わない） |
| 5 | 5MB を超える大きさで署名を求める | 400（署名を出す Route Handler が拒む） |
| 6 | 期限（1 秒で試した）が切れた URL へ PUT | 400 |
| 7 | 置いた画像の先頭の 32 バイトを、範囲を指定した `GetObject` で読む | 32 バイト、`Content-Range: bytes 0-31/572`。`RIFF`・`WEBP`・`VP8X` が読めた（#25 の種類の確認に使える） |
| 8 | 許していないオリジンからの CORS の preflight | 403。許したオリジン（`http://localhost:3100`）は 200 |

大きさの上限は、署名に `content-length` を入れて守る。ブラウザが申告した大きさ（5MB 以下）でしか署名せず、違う大きさの PUT は署名が合わずに 403 になる。署名つきの POST（`content-length-range`）は使わなかった。

## 3. 当たった問題と直し方

### 3.1 AWS SDK の既定の checksum で、PUT が全部失敗する

AWS SDK v3 の既定（`requestChecksumCalculation: 'WHEN_SUPPORTED'`）では、署名つき URL に `x-amz-checksum-crc32` と `x-amz-sdk-checksum-algorithm` が入る。この CRC32 は署名のときの空の本文の値なので、実際の画像を PUT すると Garage が `400 InvalidDigest` を返す。

**直し方**: `S3Client` に `requestChecksumCalculation: 'WHEN_REQUIRED'` を付ける。付けると URL に checksum が入らず、200 になった。

| 設定 | URL の checksum | PUT の結果 |
|---|---|---|
| 既定（`WHEN_SUPPORTED`） | `x-amz-checksum-crc32`、`x-amz-sdk-checksum-algorithm` | 400 `InvalidDigest` |
| `WHEN_REQUIRED` | 無し | 200 |

### 3.2 公開の URL はバケット名をホスト名に入れる

Garage は、匿名の S3 の読み出しではなく、ウェブの入口（`s3_web`、ポート 3902）で公開する。バケットは `<バケット名>.<root_domain>` のホスト名で引く。ローカルでは `root_domain = ".web.garage.localhost"` とし、`*.localhost` はブラウザが自分のマシンへ向ける。アプリ（`localhost:3000`）と別のホストになるので、ADR-0018 の「画像は別のドメインから出す」をローカルでも満たす。

## 4. 動いた設定

`docker-compose.yml` の部分:

```yaml
services:
  storage:
    image: dxflrs/garage:v2.5.0
    volumes:
      - ./garage/garage.toml:/etc/garage.toml:ro
      - garage-meta:/var/lib/garage/meta
      - garage-data:/var/lib/garage/data
    ports: ["3900:3900", "3902:3902"]
volumes:
  garage-meta:
  garage-data:
```

`garage/garage.toml`（`rpc_secret` と `admin_token` はローカル専用の乱数。`openssl rand -hex 32` と `-hex 16`）:

```toml
metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"
db_engine = "sqlite"
replication_factor = 1
rpc_bind_addr = "[::]:3901"
rpc_public_addr = "127.0.0.1:3901"
rpc_secret = "<64 桁の 16 進>"

[s3_api]
s3_region = "garage"
api_bind_addr = "[::]:3900"
root_domain = ".s3.garage.localhost"

[s3_web]
bind_addr = "[::]:3902"
root_domain = ".web.garage.localhost"
index = "index.html"

[admin]
api_bind_addr = "[::]:3903"
admin_token = "<32 桁の 16 進>"
```

`garage/init.sh`（レイアウト・バケット・キー・公開。冪等。キーを `.env.local` 用の形で出す）:

```sh
#!/bin/sh
set -eu
BUCKET="${1:-xmodoki-media}"
KEYNAME="${2:-xmodoki-dev}"
g() { docker compose exec -T storage /garage "$@"; }
NODE=$(g status 2>/dev/null | awk '/^[0-9a-f]{16}/{print $1; exit}')
if ! g layout show 2>/dev/null | grep -q "$NODE.*1.0 GB\|$NODE.*dc1"; then
  g layout assign -z dc1 -c 1G "$NODE" >/dev/null
  VER=$(g layout show 2>/dev/null | awk '/apply --version/{print $NF; exit}')
  g layout apply --version "${VER:-1}" >/dev/null
fi
g bucket info "$BUCKET" >/dev/null 2>&1 || g bucket create "$BUCKET" >/dev/null
if ! g key info "$KEYNAME" >/dev/null 2>&1; then g key create "$KEYNAME" >/dev/null; fi
g bucket allow --read --write --owner "$BUCKET" --key "$KEYNAME" >/dev/null
g bucket website --allow "$BUCKET" >/dev/null
g key info --show-secret "$KEYNAME" | awk '/Key ID:/{print "S3_ACCESS_KEY_ID="$3} /Secret key:/{print "S3_SECRET_ACCESS_KEY="$3}'
```

`S3Client` と署名:

```ts
import { PutBucketCorsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export function getS3() {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT, // http://localhost:3900
    region: process.env.S3_REGION, // garage（R2 は auto）
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true', // Garage は true、R2 は false
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '', secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '' },
    requestChecksumCalculation: 'WHEN_REQUIRED', // 3.1
  });
}

export async function presignPut(key: string, contentType: string, size: number, expiresIn = 60) {
  return getSignedUrl(
    getS3(),
    new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ContentType: contentType, ContentLength: size }),
    { expiresIn, signableHeaders: new Set(['content-type', 'content-length']) },
  );
}
```

CORS（アプリのオリジンだけを許す）:

```ts
await getS3().send(new PutBucketCorsCommand({
  Bucket: process.env.S3_BUCKET,
  CORSConfiguration: { CORSRules: [{ AllowedOrigins: ['http://localhost:3000'], AllowedMethods: ['PUT', 'GET'], AllowedHeaders: ['*'], MaxAgeSeconds: 600 }] },
}));
```

ブラウザからの PUT:

```ts
await fetch(url, { method: 'PUT', body: blob, headers: { 'content-type': blob.type } });
```

## 5. 実装（#15・#25）への申し送り

- `requestChecksumCalculation: 'WHEN_REQUIRED'` を必ず付ける
- CORS の設定は、リクエストのたびではなく、`init.sh`（ローカル）か、配備の手順（マイルストーン 2）で 1 回だけ行う。捨てる場所のアプリでは確かめるために毎回呼んだ
- 公開の URL の元は `NEXT_PUBLIC_MEDIA_BASE_URL=http://xmodoki-media.web.garage.localhost:3902`
- 画像の種類の確認は、範囲を指定した `GetObject`（`Range: bytes=0-31`）で先頭を読んで行う
- CI では、同じイメージをサービスのコンテナとして動かし、`init.sh` に当たる手順を流す

## 未検証事項

- Cloudflare R2 での同じ流れ（マイルストーン 2）
- 5MB に近い大きな画像を送ったときの速さ
- Firefox と WebKit からの PUT（#25 の Playwright で確かめる）

## 参考リンク

- [Garage のドキュメント](https://garagehq.deuxfleurs.fr/documentation/)
- [AWS SDK for JavaScript v3: data integrity protections（checksum の既定）](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/)
