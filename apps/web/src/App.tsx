import { useCallback, useEffect, useMemo, useState } from "react";

import { Dropzone } from "@/components/Dropzone";
import { PrivacyNote } from "@/components/PrivacyNote";
import { ResultTable, SeverityBadge } from "@/components/ResultTable";
import { RulePanel } from "@/components/RulePanel";
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
  const results = useMemo(
    () => lintParsed(parsed, enabledRules, ruleOptions),
    [parsed, enabledRules, ruleOptions],
  );
  const counts = useMemo(() => summarize(results), [results]);

  const handleFiles = useCallback(async (files: File[]) => {
    setBusy(true);
    // state 更新を描画させてから重い処理に入る（メインスレッドで解析するため）
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const next = await Promise.all(
        files.map(async (file) => parseFile(file.name, new Uint8Array(await file.arrayBuffer()))),
      );
      setParsed(next);
    } finally {
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
