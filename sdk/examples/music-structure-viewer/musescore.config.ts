import type { PluginManifest } from "@kjfsm/musescore-plugin-sdk-types";

const manifest: PluginManifest = {
  menuPath: "Plugins.Music Structure Viewer",
  title: "Music Structure Viewer",
  version: "0.1.0",
  description: "楽譜の構造を JSON 形式でスキャンして表示する。選択・コピーが可能。",
  pluginType: "dialog",
  requiresScore: true,
};

export default manifest;
