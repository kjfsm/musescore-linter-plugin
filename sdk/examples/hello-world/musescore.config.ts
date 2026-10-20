import type { PluginManifest } from "@kjfsm/musescore-plugin-sdk-types";

const manifest: PluginManifest = {
  menuPath: "Plugins.Hello World",
  title: "Hello World",
  version: "0.1.0",
  description: "TypeScript で書かれた最小構成の MuseScore 4 プラグイン。",
  pluginType: "dock",
  requiresScore: false,
};

export default manifest;
