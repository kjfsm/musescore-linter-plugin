// Vite が扱うアセット import の型。`vite/client` を types に足すと
// tsconfig.json の `types: []`（Node 型を締め出す仕掛け）が無効になるので、
// 必要な分だけここで宣言する。
declare module "*.css";
declare module "*.svg" {
	const src: string;
	export default src;
}
