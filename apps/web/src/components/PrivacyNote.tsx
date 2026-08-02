import { ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PrivacyNote() {
  return (
    <Alert>
      <ShieldCheck />
      <AlertTitle>ファイルはアップロードされません</AlertTitle>
      <AlertDescription>
        <p>解析は端末内で実行されます。ファイルがサーバーに送信されることはありません。</p>
        <p>心配な場合は、このページを開いた後、機内モードにしてからファイルを選択してください。</p>
      </AlertDescription>
    </Alert>
  );
}
