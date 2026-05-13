export * from "@kjfsm/musescore-plugin-sdk-types";

import type { EngravingItem, Segment } from "@kjfsm/musescore-plugin-sdk-types";

/**
 * MuseScore テキスト系要素（StaffText / TempoText / Dynamic 等）。
 * SDK types に含まれないプロパティのみ補完する。
 * `Segment.annotations` の要素型として使用する。
 */
export interface TextAnnotation extends EngravingItem {}

/**
 * `Segment.elementAt()` で返される楽譜要素の拡張型。
 * Chord/Rest の `duration` プロパティを補完する。
 */
export interface ScoreElement extends EngravingItem {
	readonly duration?: { numerator: number; denominator: number };
}

/**
 * `Segment` の `annotations` と `elementAt` を上書きした拡張型。
 */
export interface PluginSegment
	extends Omit<Segment, "annotations" | "elementAt"> {
	readonly annotations: TextAnnotation[];
	elementAt(track: number): ScoreElement | null;
}
