export interface PluginManifest {
  menuPath: string;
  title: string;
  version: string;
  description?: string;
  requiresScore?: boolean;
  pluginType?: "dialog" | "dock";
  categoryCode?: string;
  thumbnailName?: string;
}
