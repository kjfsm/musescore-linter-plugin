import type { EngravingItem } from "@kjfsm/musescore-plugin-sdk-types";
import { trackToStaffIdx } from "./tracks.js";

type AnnotationWithTextProps = {
  plainText?: unknown;
  text?: unknown;
  track?: unknown;
};

/**
 * Returns the annotation's display text with HTML tags stripped and whitespace trimmed.
 * Falls back to `text` if `plainText` is unavailable.
 */
export function getAnnotationText(ann: EngravingItem): string {
  const a = ann as unknown as AnnotationWithTextProps;
  const raw =
    typeof a.plainText === "string" ? a.plainText : typeof a.text === "string" ? a.text : "";
  return raw.replace(/<[^>]*>/g, "").trim();
}

/**
 * Resolves the staff index for an annotation.
 * Returns -1 for global (score-wide) annotations.
 */
export function getAnnotationStaffIdx(ann: EngravingItem): number {
  const track = (ann as unknown as AnnotationWithTextProps).track;
  if (typeof track === "number" && track >= 0) {
    return trackToStaffIdx(track);
  }
  if (ann.staffIdx >= 0) return ann.staffIdx;
  return -1;
}
