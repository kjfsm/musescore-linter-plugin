import type { PluginManifest } from "@kjfsm/musescore-plugin-sdk-types";

const manifest: PluginManifest = {
  menuPath: "Plugins.List TODOs",
  title: "List TODOs",
  version: "0.1.0",
  description: "スコア内のテキスト要素から TODO/FIXME を含むものを抽出してログに出力する。",
  pluginType: "dialog",
  requiresScore: true,
};

export default manifest;
