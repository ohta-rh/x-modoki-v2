---
okf_version: "0.2"
---

# x-modoki のドキュメント

X（x.com）の Web 版の見た目と操作を再現する、Next.js の 1 つのアプリの設計と決定の記録。書き方の決まりは [ADR-0002](adr/0002-docs-as-okf-bundle.md)。

# 最初に読むもの

* [アーキテクチャの全体像](architecture/overview.md) - x-modoki の目的、全体の構成、主な処理の流れ、リスクを 1 枚で示す。
* [Architecture Decision Records](adr/README.md) - ADR の一覧とステータス。

# ディレクトリ

* [architecture/](architecture/index.md) - 今の設計（構成・技術・構造・ルーティング・データ・UI・環境）
* [adr/](adr/) - 決定とその理由
* [requirements/](requirements/index.md) - ID の付いた要件（機能・機能でない）
* [guides/](guides/index.md) - 動かし方と困ったときの手順
* [research/](research/index.md) - 決定の根拠にした調査（日付つきの記録）
* [test-reports/](test-reports/index.md) - 何を確かめ、何が見えたかの記録（画面の写真つき）

# 履歴

* [log.md](log.md) - ドキュメントの追加と変更の履歴

# type の一覧

* `ADR` - 1 つの決定とその理由（`adr/`）
* `Template` - 写して使うひな形
* `Reference` - 一覧や索引
* `Architecture` - 今のシステムの構造
* `Design` - 見た目と操作の仕様
* `Research` - ある日付の時点の調査の結果
* `Guide` - 動かし方・運用の手順
* `Requirements` - ID の付いた要件
* `TestReport` - 1 つの作業について、確かめたことと見えたものの記録（エビデンスつき）
