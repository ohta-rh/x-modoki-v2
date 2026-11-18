# 要件

* [機能の要件](functional.md) - 最初の版の全ての機能を、ID・説明・観測できる受け入れの条件・確かめ方の層・満たす PBI で定める。
* [機能でない要件](non-functional.md) - アクセシビリティ・速さ・対応する環境・安全性・言語・保守の基準を、ID・数値・確かめ方で定める。
* [要件とテストの対応](traceability.md) - 全ての FR- と NFR- の要件、とルーティングの全ての URL について、満たす PBI と確かめるテストを並べた表で、scripts/check-traceability.mjs が CI で確かめる（ADR-0053）。
