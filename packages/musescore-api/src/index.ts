export * from "@kjfsm/musescore-plugin-sdk-types";

import type { EngravingItem, Segment } from "@kjfsm/musescore-plugin-sdk-types";

/**
 * MuseScore テキスト系要素（StaffText / TempoText / Dynamic 等）。
 * `Segment.annotations` の要素型として使用する。
 */
export interface TextAnnotation extends EngravingItem {}

/**
 * `Segment` の `annotations` を上書きした拡張型。
 * SDK v1.1.0 で `DurationElement.duration` が正式追加されたため `elementAt` の
 * オーバーライドは不要になり、SDK の `Segment.elementAt(): EngravingItem | null` を継承する。
 */
export interface PluginSegment extends Omit<Segment, "annotations"> {
	readonly annotations: TextAnnotation[];
}
