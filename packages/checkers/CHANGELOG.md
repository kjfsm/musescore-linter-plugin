# @musescore-linter/checkers

## 2.1.1

### Patch Changes

- c69f6a5: 重複ダイナミクスチェッカー: 間にヘアピン（クレッシェンド/デクレッシェンド）がある場合は重複判定しないよう修正
- Updated dependencies [c69f6a5]
  - @musescore-linter/core@2.1.3

## 2.1.0

### Minor Changes

- [#60](https://github.com/kjfsm/musescore-linter-plugin/pull/60) [`f948ced`](https://github.com/kjfsm/musescore-linter-plugin/commit/f948ceda7bec23b364aedce4b1babd0695ae97cf) Thanks [@kjfsm](https://github.com/kjfsm)! - 新規チェッカー 3 件追加・coda-segno 整合性チェック追加・テスト強化・エクスポート機能拡充

  **新規チェッカー（テキストペア型）**

  - `sul-tasto-ord`: Sul tasto → Ord. の対応漏れを検知（warning）
  - `sul-pont-ord`: Sul pont. → Ord. の対応漏れを検知（warning）
  - `con-legno-arco`: Con legno → Arco の対応漏れを検知（warning）

  **新規チェッカー（独立型）**

  - `coda-segno`: D.S./D.C. と Segno・Coda マークの対応関係を確認。参照先マークの欠落を検知（error）

  **テスト強化**

  - `rest-annotation`: 複数スタッフ・音符位置の追加ケース
  - `tempo-barline`: 同テンポ値スキップ・複数テンポ変更の追加ケース
  - `sul-tasto-ord`, `sul-pont-ord`, `con-legno-arco`: 各 3 件
  - `coda-segno`: 5 件
  - `irBuilder.quintetIR()`: 弦楽五重奏 5 スタッフの clean fixture ヘルパーを追加
  - `enabledRules`: 複数ルール同時 off のケースを追加
  - 計 59 テストケース（+13）

  **UI: エクスポート形式の拡充**

  - コピーボタンをドロップダウンメニューに変更
  - テキスト形式・Markdown テーブル形式・CSV 形式の 3 種類から選択可能に

  **内部改善**

  - `registerAll()` の `registeredOnce` フラグを削除し、毎回 `reset()` + 全登録する設計に変更（テスト時の registry 状態リークを修正）

### Patch Changes

- Updated dependencies [[`1e9cc57`](https://github.com/kjfsm/musescore-linter-plugin/commit/1e9cc57bdcd871ca8870725f8e406210f9e43e77)]:
  - @musescore-linter/core@2.1.2

## 2.0.2

### Patch Changes

- Updated dependencies [[`bf66404`](https://github.com/kjfsm/musescore-linter-plugin/commit/bf66404524c97a417d997c969c9a9fb5aa76ba78)]:
  - @musescore-linter/core@2.1.1

## 2.0.1

### Patch Changes

- Updated dependencies [[`43902ef`](https://github.com/kjfsm/musescore-linter-plugin/commit/43902ef2e2d33e22841f4e5ffe538f2d503d136d), [`50ef241`](https://github.com/kjfsm/musescore-linter-plugin/commit/50ef24170bd9abb91b69ca3b60154d7c63f16ee8), [`dfb2cec`](https://github.com/kjfsm/musescore-linter-plugin/commit/dfb2cec5646545bbc23422e2dc7cfd470d774b8e)]:
  - @musescore-linter/core@2.1.0
