// 「アップロードしたファイルは送信されない」の実質的な検証。
// 自前で書いたコード（エントリチャンク）にネットワーク API が現れた時点で主張が崩れるので止める。
// 動的 import で分離された vendor チャンク（例: opensheetmusicdisplay）は対象外にしている。
// 中身を完全には制御できない第三者ライブラリのコードで、実行時の実質的な歯止めは
// _headers の `connect-src 'none'`（fetch/XHR/WebSocket 等をブラウザレベルで禁止）に委ねる。
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dist = join(import.meta.dirname, "..", "dist");
const network = /fetch\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource/;
const failures: string[] = [];

for (const file of readdirSync(join(dist, "assets"))) {
  if (!/^index-.*\.js$/.test(file)) continue;
  if (network.test(readFileSync(join(dist, "assets", file), "utf8"))) {
    failures.push(`apps/web のバンドルにネットワーク API が含まれています: ${file}`);
  }
}
if (/<script[^>]*>[^<]/.test(readFileSync(join(dist, "index.html"), "utf8"))) {
  failures.push(
    "apps/web/dist/index.html にインライン script があります（CSP script-src 'self' に違反）",
  );
}

for (const failure of failures) console.error(`::error::${failure}`);
if (failures.length > 0) process.exit(1);
