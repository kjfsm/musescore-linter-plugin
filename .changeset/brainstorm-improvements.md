---
"@musescore-linter/checkers": minor
---

新規チェッカー3件追加・coda-segno整合性チェック追加・テスト強化・エクスポート機能拡充

**新規チェッカー（テキストペア型）**
- `sul-tasto-ord`: Sul tasto → Ord. の対応漏れを検知（warning）
- `sul-pont-ord`: Sul pont. → Ord. の対応漏れを検知（warning）
- `con-legno-arco`: Con legno → Arco の対応漏れを検知（warning）

**新規チェッカー（独立型）**
- `coda-segno`: D.S./D.C. と Segno・Coda マークの対応関係を確認。参照先マークの欠落を検知（error）

**テスト強化**
- `rest-annotation`: 複数スタッフ・音符位置の追加ケース
- `tempo-barline`: 同テンポ値スキップ・複数テンポ変更の追加ケース
- `sul-tasto-ord`, `sul-pont-ord`, `con-legno-arco`: 各3件
- `coda-segno`: 5件
- `irBuilder.quintetIR()`: 弦楽五重奏5スタッフの clean fixture ヘルパーを追加
- `enabledRules`: 複数ルール同時 off のケースを追加
- 計 59 テストケース（+13）

**UI: エクスポート形式の拡充**
- コピーボタンをドロップダウンメニューに変更
- テキスト形式・Markdown テーブル形式・CSV 形式の3種類から選択可能に

**内部改善**
- `registerAll()` の `registeredOnce` フラグを削除し、毎回 `reset()` + 全登録する設計に変更（テスト時の registry 状態リークを修正）
