import { ChevronRight, CircleCheck } from "lucide-react";
import { useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LintedFile, ParsedFile } from "@/lib/lint";
import { toRows } from "@/lib/rows";

import { ScorePreview } from "./ScorePreview";
import { SeverityBadge } from "./SeverityBadge";

/** 読めなかったファイル向けの案内。.mscz だけは原因がはっきりしているので特別扱いする。 */
function failureHint(name: string, error: string): string {
  if (name.toLowerCase().endsWith(".mscz")) {
    return "MuseScore の .mscz は独自形式のため直接は読めません。MuseScore で「エクスポート」→ MusicXML を選んで書き出したファイルを読み込ませてください。";
  }
  return error;
}

/**
 * 既定で閉じておき、開いたときだけ ScorePreview（＝OSMD の動的 import と構築）を走らせる。
 * 未展開のファイルでは OSMD のコストを一切払わない。
 */
function ScorePreviewSection({ name, xml }: { name: string; xml: string }) {
  const [hasOpened, setHasOpened] = useState(false);

  return (
    <details
      className="group rounded-lg border"
      onToggle={(e) => {
        if (e.currentTarget.open) setHasOpened(true);
      }}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden />
        楽譜プレビュー
      </summary>
      {hasOpened && <ScorePreview name={name} xml={xml} />}
    </details>
  );
}

export interface ResultTableProps {
  parsed: ParsedFile[];
  results: LintedFile[];
}

export function ResultTable({ parsed, results }: ResultTableProps) {
  // file 名だけをキーにすると、別フォルダにある同名ファイルを 2 つ D&D したときに
  // Map のキーも React の key も衝突し、結果が取り違えられる。parsed 配列内の位置
  // （index）は一意なのでそちらをキーにする。
  const byIndex = new Map(results.map((r) => [r.index, r]));

  return (
    <div className="flex flex-col gap-6">
      {parsed.map((file, i) => {
        if (file.error !== undefined) {
          return (
            <section key={`${i}:${file.name}`} className="flex flex-col gap-2">
              <h2 className="font-medium">{file.name}</h2>
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {failureHint(file.name, file.error)}
              </p>
            </section>
          );
        }

        const issues = byIndex.get(i)?.issues ?? [];
        const rows = toRows(issues);

        return (
          <section key={`${i}:${file.name}`} className="flex flex-col gap-2">
            <h2 className="font-medium">{file.name}</h2>
            <ScorePreviewSection name={file.name} xml={file.xml} />
            {rows.length === 0 ? (
              <p className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
                <CircleCheck className="size-4" aria-hidden />
                問題は見つかりませんでした
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">小節</TableHead>
                      <TableHead className="w-28">severity</TableHead>
                      <TableHead className="w-40">パート</TableHead>
                      <TableHead>内容</TableHead>
                      <TableHead className="w-56">ルール</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="tabular-nums">
                          {row.measure > 0 ? `m.${row.measure}` : "—"}
                        </TableCell>
                        <TableCell>
                          <SeverityBadge severity={row.severity} />
                        </TableCell>
                        <TableCell>{row.partName || "—"}</TableCell>
                        <TableCell>{row.message}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {row.ruleId}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
