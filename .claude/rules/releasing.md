---
description: 公開パッケージの採番・changeset の bump 種別・旧系列の back-port
paths:
  - ".changeset/**"
  - "packages/*/package.json"
  - "packages/*/CHANGELOG.md"
  - ".github/workflows/release*.yml"
---

# リリース・採番方針

公開パッケージ `@kjfsm/musescore-plugin-sdk-types` / `-helpers` のバージョニングとリリース運用。

## 採番スキーム（types）

**型パッケージの major ⇔ MuseScore の minor を対応させる。**

| types | MuseScore | 系列ブランチ |
|---|---|---|
| `0.1.x` | 4.6（レガシー） | `release/4.6` |
| `1.x` | 4.7 | `main` |
| `2.x` | 4.8（予定） | `main` |

- 対応する MuseScore バージョンは `packages/types/src/generated/_meta.ts` の `generatedFrom.tag` に記録される（番号自体に MuseScore 版は埋め込まない）。
- なぜ「minor = major」か: MuseScore の minor は型に破壊的変更を入れることがある（例: 4.6→4.7 で apiv1 の `FractionWrapper`→`Fraction` 改名、`API_PROPERTY_ENUM` マクロ導入）。semver 上これは major 相当。

## changeset の bump 種別（types）

| やること | bump | 例 |
|---|---|---|
| 次の MuseScore minor へ乗り換え | `major` | 1.x → `2.0.0` |
| 同じ MuseScore で型/ヘルパ追加 | `minor` | `1.0.0` → `1.1.0` |
| 同じ MuseScore でバグ修正 | `patch` | `1.0.0` → `1.0.1` |

> changeset は番号を直接指定できない。bump 種別から計算され、結果は Version Packages PR に出る（公開前に必ず確認する）。

### 例外: MuseScore バージョンを跨がない破壊的変更

型安全性の強化など、同じ MuseScore 対応のまま公開 API の形（`enums.ts` の出力形など）を破壊的に変える場合も `major` を使う。この場合 major 番号は MuseScore の minor 更新とは対応しなくなる（例: 4.7 対応のまま `1.x → 2.0.0`）ため、`generatedFrom.tag` を必ず確認し、対応表とズレていないか changeset の説明に明記する。

## ブランチモデル

- `main` … 最新 MuseScore 系列（現在 4.7 = `1.x`）。
- `release/4.x` … 旧 MuseScore のメンテナンス系列。旧版の修正はここにコミットして公開する。
- 機能開発は feature ブランチ → PR → `main`。

## 旧系列の修正（back-port）

1. `release/4.x` に修正をコミット＋ `pnpm changeset`（通常 `patch`）。
2. **`npm publish` は既定で `latest` を更新する。** 旧系列を公開するときは **dist-tag 指定**で出し、`latest`（最新 MuseScore 系列）を巻き戻さないこと。
3. dist-tag の例: `npm dist-tag add @kjfsm/musescore-plugin-sdk-types@<旧版> ms-4.6`。
4. release ワークフロー（`.github/workflows/release.yml`）は `main` 前提。`release/*` から公開するには workflow を拡張するか CI 上で publish する（provenance 維持のためローカル手動は避ける）。

## helpers の追従

`@kjfsm/musescore-plugin-sdk-helpers` は types を **peer 依存**（`workspace:*`）。types を bump すると changesets により helpers も追従バンプされる。上げ幅は Version Packages PR で確認する。helpers を独立採番のままにするか MuseScore 連動にするかは別途判断する。

## やってはいけない

- 公開済みバージョンの上書き（必ず新しい patch/minor/major を出す）。
- 旧系列の公開で `latest` を巻き戻す（dist-tag を使う）。
