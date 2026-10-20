import type { PluginManifest } from "@kjfsm/musescore-plugin-sdk-types";

const manifest: PluginManifest = {
  menuPath: "Plugins.Goto Measure 8",
  title: "Goto Measure 8",
  version: "0.1.0",
  description:
    "8 小節目（Measure.no === 7）にジャンプする最小デモ。findMeasureByIndex と jumpToMeasure を使用。",
  pluginType: "dialog",
  requiresScore: true,
};

export default manifest;
