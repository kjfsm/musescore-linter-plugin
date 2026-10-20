import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LintedFile } from "@/lib/lint";
import { type ExportFormat, exportResults } from "@/lib/rows";

/** サーバーには何も送らない（`connect-src 'none'` の下でも動く）。 */
function download(results: LintedFile[], format: ExportFormat) {
  const { text, mimeType, extension } = exportResults(results, format);
  const url = URL.createObjectURL(new Blob([text], { type: `${mimeType};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `score-lint.${extension}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButtons({ results }: { results: LintedFile[] }) {
  const disabled = results.length === 0;
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => download(results, "markdown")}
      >
        <Download aria-hidden />
        Markdown で書き出す
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => download(results, "csv")}
      >
        <Download aria-hidden />
        CSV で書き出す
      </Button>
    </div>
  );
}
