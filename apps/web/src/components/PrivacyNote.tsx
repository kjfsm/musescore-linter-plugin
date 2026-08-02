import { ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PrivacyNote() {
  return (
    <Alert>
      <ShieldCheck />
      <AlertTitle>ファイルはこの端末から出ません</AlertTitle>
      <AlertDescription>
        <p>
          解析はすべてブラウザの中で行われます。このサイトはサーバー側のプログラムを一切持たず、
          静的ファイルだけを配信しています。受け取る側のコードが存在しないので、譜面が送られることはありません。
        </p>
        <p>
          配信時のセキュリティヘッダで <code>connect-src 'none'</code>{" "}
          を指定しており、ページからの通信そのものがブラウザレベルで禁止されています。
          開発者ツールの Network
          タブを開いたまま操作すれば、実際に何も送信していないことを確認できます。
        </p>
      </AlertDescription>
    </Alert>
  );
}
