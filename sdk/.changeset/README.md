# Changesets

このディレクトリは [changesets](https://github.com/changesets/changesets) で管理しています。

## changeset の追加

リリースに含めたい変更を作ったら、changeset を追加してください。

```sh
pnpm changeset
```

対象パッケージを選び、`patch` / `minor` / `major` を指定し、要約を書きます。
生成された `.changeset/*.md` を変更と一緒にコミットします。

private パッケージ(`@kjfsm/musescore-plugin-sdk-types-generator`、`@kjfsm/musescore-plugin-sdk-hello-world` 等の examples)は
publish 対象から自動的に除外されます。

## リリースフロー

GitHub Actions の `Release` / `Release Dry Run` の二層構成で運用します。

1. **`Release` ワークフロー**(`.github/workflows/release.yml`)
   `main` への push をトリガに `changesets/action@v1` が動き、未消化の changeset があれば
   `Version Packages` という PR を自動作成します。これがリリース対象のバージョン bump と
   `CHANGELOG.md` 更新を含みます。

2. **`Release Dry Run` ワークフロー**(`.github/workflows/release-dry-run.yml`)
   `changeset-release/<base>` ブランチからの PR に対して `pnpm -r publish --dry-run` を
   実行し、バージョン衝突 / npm 認証 / provenance OIDC 署名の可否 / tarball の dist 同梱を
   merge 前に検証します。

3. `Version Packages` PR を merge すると、再度 `Release` が走り `changeset publish` で
   npm に公開されます。npm provenance(`NPM_CONFIG_PROVENANCE=true`)を有効にしているので、
   GitHub Actions の OIDC によるサプライチェーン署名が付きます。

## 必要な repository secret

| Secret 名 | 用途 |
| --- | --- |
| `NPM_TOKEN` | `changeset publish` での npm 認証。`Automation` トークン推奨 |
| `RELEASE_PAT` | デフォルトの `GITHUB_TOKEN` で作成された PR は他ワークフロー(= `Release Dry Run`)を起動しない仕様の回避策。`contents: write` / `pull-requests: write` を持つ PAT を登録 |

`RELEASE_PAT` を設定しないと、`Version Packages` PR 上で dry-run が走らずリリースの事前検証が
スキップされます。
