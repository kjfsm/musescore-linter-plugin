import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { Dropzone } from "@/components/Dropzone";
import { PrivacyNote } from "@/components/PrivacyNote";
import { ResultTable } from "@/components/ResultTable";
import { RulePanel } from "@/components/RulePanel";
import { SeverityBadge } from "@/components/SeverityBadge";
import { type ParsedFile, lintParsed, parseFile } from "@/lib/lint";
import { summarize } from "@/lib/rows";
import {
  loadEnabledRules,
  loadRuleOptions,
  type RuleOptions,
  saveEnabledRules,
  saveRuleOptions,
} from "@/lib/rules";

const SEVERITIES = ["error", "warning", "info"] as const;

export function App() {
  const [parsed, setParsed] = useState<ParsedFile[]>([]);
  const [enabledRules, setEnabledRules] = useState<Record<string, boolean>>(() =>
    loadEnabledRules(localStorage),
  );
  const [ruleOptions, setRuleOptions] = useState<RuleOptions>(() => loadRuleOptions(localStorage));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    saveEnabledRules(localStorage, enabledRules);
  }, [enabledRules]);

  useEffect(() => {
    saveRuleOptions(localStorage, ruleOptions);
  }, [ruleOptions]);

  // パースは重いが lint は軽いので、ルールを切り替えたときは IR を使い回して
  // checker だけ流し直す。
  //
  // ただし lint は同期処理（大きな楽譜で 30ms 前後）で、レンダー中に走ると
  // チェックボックスの反応そのものが待たされる。ルール設定を遅延値にして、
  // 「操作の反映」と「結果の再計算」を別のレンダーに分ける。前者は即座に、
  // 後者は中断可能な優先度で走る。
  const deferredRules = useDeferredValue(enabledRules);
  const deferredOptions = useDeferredValue(ruleOptions);
  const recomputing = deferredRules !== enabledRules || deferredOptions !== ruleOptions;

  const results = useMemo(
    () => lintParsed(parsed, deferredRules, deferredOptions),
    [parsed, deferredRules, deferredOptions],
  );
  const counts = useMemo(() => summarize(results), [results]);

  // 解析中の多重投入を防ぐ。busy はボタンしか無効化しておらず、ドロップ自体は
  // 生きているので、先に終わった側の finally が busy を false に戻してしまう。
  const parsingRef = useRef(false);

  const handleFiles = useCallback(async (files: File[]) => {
    if (parsingRef.current) return;
    parsingRef.current = true;
    setBusy(true);
    try {
      const next: ParsedFile[] = [];
      for (const file of files) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        // ファイルごとに 1 フレーム譲る。parseFile は同期 CPU 処理（大きな楽譜で
        // 280ms 前後）なので、Promise.all にしても間で描画されず、複数ファイルが
        // 1 つの長いブロックになる。
        await new Promise((resolve) => setTimeout(resolve, 0));
        next.push(parseFile(file.name, bytes));
      }
      setParsed(next);
    } finally {
      parsingRef.current = false;
      setBusy(false);
    }
  }, []);

  const hasFiles = parsed.length > 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">楽譜のちょっとしたミスをチェックするやつ</h1>
        <p className="text-muted-foreground">
          MusicXML
          を分析して、アーティキュレーションや強弱記号のミスなどをチェックすることができます。
        </p>
        <p className="text-muted-foreground">
          MusicXML での保存については、各ソフトのヘルプを参照してください。 <br />
          （MuseScoreでは「エクスポート」→「フォーマット:MusicXML」）
        </p>
      </header>

      <PrivacyNote />

      <Dropzone onFiles={handleFiles} busy={busy} />

      <RulePanel
        enabledRules={enabledRules}
        onChange={setEnabledRules}
        ruleOptions={ruleOptions}
        onOptionsChange={setRuleOptions}
      />

      {busy && <p className="text-sm text-muted-foreground">解析中…</p>}

      {!busy && hasFiles && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{parsed.length} ファイル</span>
            {recomputing && <span className="text-sm text-muted-foreground">再計算中…</span>}
            {SEVERITIES.map((severity) => (
              <span key={severity} className="flex items-center gap-1 text-sm">
                <SeverityBadge severity={severity} />
                {counts[severity]}
              </span>
            ))}
          </div>
          <ResultTable parsed={parsed} results={results} />
        </>
      )}

      <footer className="border-t pt-4 text-sm text-muted-foreground">
        <p>
          <a
            className="underline underline-offset-4"
            href="https://github.com/kjfsm/musescore-linter-plugin"
          >
            ソースコード（GitHub）
          </a>
        </p>
      </footer>
    </div>
  );
}
