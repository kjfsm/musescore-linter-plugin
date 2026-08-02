import type { FileResult } from "@musescore-linter/cli";
import type { Severity } from "@musescore-linter/core";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ParsedFile } from "@/lib/lint";
import { toRows } from "@/lib/rows";

const SEVERITY_VARIANT: Record<Severity, "destructive" | "secondary" | "ghost"> = {
  error: "destructive",
  warning: "secondary",
  info: "ghost",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const Icon = severity === "error" ? CircleAlert : severity === "warning" ? TriangleAlert : Info;
  return (
    <Badge variant={SEVERITY_VARIANT[severity]}>
      <Icon aria-hidden />
      {severity}
    </Badge>
  );
}

/** 読めなかったファイル向けの案内。.mscz だけは原因がはっきりしているので特別扱いする。 */
function failureHint(name: string, error: string): string {
  if (name.toLowerCase().endsWith(".mscz")) {
    return "MuseScore の .mscz は独自形式のため直接は読めません。MuseScore で「エクスポート」→ MusicXML を選んで書き出したファイルを読み込ませてください。";
  }
  return error;
}

export interface ResultTableProps {
  parsed: ParsedFile[];
  results: FileResult[];
}

export function ResultTable({ parsed, results }: ResultTableProps) {
  const byFile = new Map(results.map((r) => [r.file, r]));

  return (
    <div className="flex flex-col gap-6">
      {parsed.map((file) => {
        if (file.error !== undefined) {
          return (
            <section key={file.name} className="flex flex-col gap-2">
              <h2 className="font-medium">{file.name}</h2>
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {failureHint(file.name, file.error)}
              </p>
            </section>
          );
        }

        const issues = byFile.get(file.name)?.issues ?? [];
        const rows = toRows(issues);

        return (
          <section key={file.name} className="flex flex-col gap-2">
            <h2 className="font-medium">{file.name}</h2>
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
