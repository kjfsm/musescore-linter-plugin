import type { PluginManifest } from "@kjfsm/musescore-plugin-sdk-types";

const manifest: PluginManifest = {
  menuPath: "Plugins.Color Selected",
  title: "Color Selected",
  version: "0.1.0",
  description: "選択中の音符（または範囲選択がなければスコア全体）を赤く着色する。",
  pluginType: "dialog",
  requiresScore: true,
};

export default manifest;
