// QML の JS 環境が持つグローバルのうち、バンドルに入るコードが使うもの。
// lib に DOM を入れると fetch や window まで通ってしまうので、必要な分だけ宣言する。
declare const console: {
  log(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};
