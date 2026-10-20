import type { PluginManifest } from "@kjfsm/musescore-plugin-sdk-types";

const manifest: PluginManifest = {
  menuPath: "Plugins.Score Info",
  title: "Score Info",
  version: "0.1.0",
  description: "メタタグと簡単な統計（小節数・コード数・音符数）をログに出力する。",
  pluginType: "dialog",
  requiresScore: true,
};

export default manifest;
