# SDK 拡張プラン（音高・拍子・楽器情報などを IR に載せる）

`docs/notation-checklist.md` の `SDK` タグ項目（異音程タイ・拍頭の休符・臨時記号の綴り など）は、
現行 LintIR にデータが無いため作れない。これらを解放するための **SDK 拡張の段階プラン**。

## データ供給経路

```
musescore-plugin-sdk (types/helpers)  →  musescore-api ブリッジ  →  core/snapshot.ts  →  LintEvent / IRMeta  →  checker
        (別リポジトリ・npm 公開)                (本リポジトリ)
```

**重要な制約**: 2 つは別リポジトリ。プラグインは npm 公開された
`@kjfsm/musescore-plugin-sdk-helpers` / `-types` に依存する。よって SDK 側の新 helper は
**公開（リリース）されて初めてプラグインの `snapshot.ts` から使える**。
CLAUDE.md の「不足機能をプラグイン側で回避実装しない」に従い、SDK helper を先に出し、
プラグインはそれを消費する順序で進める。

## 段階プラン

| Tier | 追加データ | SDK 側 | プラグイン側 | 解放されるチェック |
|---|---|---|---|---|
| 1 | **音高 / タイ** | `getNotePitches` / `isTie` / `getTiePitches`（追加済み） | `LintEvent.pitches` / `meta.ties`、snapshot 配線 | D6 異音程タイ、（将来）J 系 |
| 2 | **リピート種別** | `classifyBarlineKind` を start/end/both に細分（変更済み） | `barlineKinds` 細分、snapshot は既存経路 | E3 リピート対応 |
| 3 | **拍子** | `getMeasureTimeSig`（既存）を利用 | `meta.timeSigByMeasure`、snapshot 配線 | F1 拍頭の休符、F2/F3 |
| 4 | **楽器メタ** | `Part.instrumentId`/`hasPitchedStaff`/`Staff.transpose`（生成型に既存）。必要なら `getInstrumentInfo` helper | `meta.parts[]` に楽器種別/移調 | H1, H3, H6, D7 |
| 5 | **グリッサンド / 連符 / 歌詞** | `isGlissando` 等の type guard | `meta.glissandos` 等 | D4, I2, F4, H7, H8 |
| 6 | **臨時記号の綴り** | `Note.tpc` を helper 公開 | `LintEvent.tpc[]` | J1–J4 |

## このバッチで完了した範囲（Tier 1 + 2 の土台）

### SDK 側（musescore-plugin-sdk・要リリース）
- `getNotePitches(chord)` / `isTie(el)` / `getTiePitches(tie)` を追加。
- `classifyBarlineKind` を `repeat` → `repeat_start` / `repeat_end` / `repeat_both` に細分。
- changeset 追加済み（helpers: minor）。

### プラグイン側（本リポジトリ・現行 IR だけで完結する部分）
- `LintEvent.pitches?`、`IRMeta.ties`（`TieInfo`）を追加（`types.ts`）。
- `barlineKinds` を `REPEAT_START/END/BOTH` に細分（`enumRegistry.ts` / `types.ts`）。
- `irBuilder` に `pitches` / `ties` のサポートを追加（テスト用）。
- 新チェッカー 2 種を実装・テスト（IR だけで動作・検証可能）:
  - `repeat-barline-match`（リピート開始に対応する終了が無い）。
  - `tie-pitch-mismatch`（異音程をタイで結んでいる）。

## 残作業（SDK helpers 公開後にプラグインで行う）

SDK helpers の新バージョンが npm 公開されたら:

1. `packages/core/package.json` の `@kjfsm/musescore-plugin-sdk-helpers` を新 minor に上げて `pnpm install`。
2. `packages/core/src/snapshot.ts` の chord 処理に音高・タイの抽出を配線（下記）。
   これにより `repeat-barline-match` / `tie-pitch-mismatch` が実楽譜でも発火するようになる
   （現状はテスト fixture でのみ検証済み。`meta.ties` は空、barlineKind は旧 helper 由来）。

```ts
// snapshot.ts、isChord(el) ブロック内（既存の el.notes ループに追記）
ev.pitches = getNotePitches(el);
for (const note of el.notes ?? []) {
  const tie = note.tieForward; // SDK Note.tieForward: Tie | null
  if (tie) {
    const range = getSpannerRange(tie);
    const p = getTiePitches(tie);
    ir.meta.ties.push({
      staffIdx,
      voice,
      startTick: range.startTick,
      endTick: range.endTick,
      startPitch: p?.startPitch ?? null,
      endPitch: p?.endPitch ?? null,
    });
  }
  // 既存の spannerForward（hairpin/slur）処理は据え置き
}
```

3. リピート小節線は既存の `classifyBarlineKind(barEl.barlineType)` 経路がそのまま
   `repeat_start/end/both` を返すようになる（新 helper をバンドルするだけ）。

## 検証

- SDK: `pnpm --filter @kjfsm/musescore-plugin-sdk-helpers test`（音高/タイ/リピート分類）。
- プラグイン: `pnpm test`（`repeat-barline-match` / `tie-pitch-mismatch` の単体テスト）。
- snapshot 配線後は実際の MuseScore スコアで `meta.ties` が埋まること、異音程タイが検出されることを手動確認
  （snapshot は MuseScore ランタイム依存のため単体テスト対象外）。
