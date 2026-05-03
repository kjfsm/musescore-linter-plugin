/**
 * MuseScore 4 Plugin API 型定義
 *
 * 公式ドキュメント:
 * https://musescore.github.io/MuseScore_PluginAPI_Docs/plugins/html/index.html
 */

/** スコア全体。QML の `curScore` に対応する。 */
export interface MsScore {
	/** スタッフ（段）の総数 */
	nstaves: number;
	/** パート一覧。スコアにパートがない場合は undefined。 */
	parts?: MsPart[];
	/** 最初の小節。空スコアの場合は null。 */
	firstMeasure: MsMeasure | null;
}

/** パート（楽器）情報 */
export interface MsPart {
	/** パートの正式名称（例: "Violin I"）。未設定の場合は undefined。 */
	longName?: string;
	/** このパートが使用する最初のトラック番号（track = staffIdx × 4 + voice） */
	startTrack: number;
	/** このパートが使用する最後のトラック番号（exclusive） */
	endTrack: number;
}

/** 小節 */
export interface MsMeasure {
	/** 小節内の最初のセグメント */
	firstSegment: MsSegment | null;
	/** 次の小節。最終小節の場合は null。 */
	nextMeasure: MsMeasure | null;
}

/**
 * セグメント（小節内の位置）
 *
 * セグメントは tick が同じ要素（音符・休符・注釈）をまとめた単位。
 */
export interface MsSegment {
	/** セグメントの開始 tick */
	tick: number;
	/**
	 * このセグメントに付いているアノテーション（テキスト指示・強弱記号・テンポなど）。
	 * アノテーションは特定スタッフ、またはスコア全体（global）に属する。
	 */
	annotations: MsAnnotation[];
	/** 次のセグメント。小節末の場合は null。 */
	next: MsSegment | null;
	/**
	 * 指定トラックの要素を返す。
	 * @param track staffIdx × 4 + voice
	 */
	elementAt(track: number): MsElement | null;
}

/**
 * アノテーション（テキスト指示・強弱記号・テンポマークなど）
 *
 * - スタッフ付き: `track` または `staffIdx` が正の値
 * - グローバル（スコア全体）: `track` と `staffIdx` が負または undefined
 */
export interface MsAnnotation {
	/** トラック番号（staffIdx × 4 + voice）。未設定の場合は undefined。 */
	track?: number;
	/** スタッフインデックス。`track` が設定されていない場合に使用。 */
	staffIdx?: number;
	/** 要素タイプ（`Element.TEMPO_TEXT`, `Element.DYNAMIC` 等の QML 列挙値） */
	type?: unknown;
	/** サブタイプ（ダイナミクスの種類など） */
	subtype?: unknown;
	/** サブスタイル */
	subStyle?: unknown;
	/** テンポ値（BPS）。テンポマークの場合のみ設定される。 */
	tempo?: number;
	/** HTML タグを除去したプレーンテキスト */
	plainText?: string;
	/** HTML タグを含む生テキスト */
	text?: string;
}

/**
 * 楽譜要素（音符・休符・小節線など）
 *
 * `MsSegment.elementAt()` で取得する。
 */
export interface MsElement {
	/** 要素タイプ（`Element.CHORD`, `Element.REST`, `Element.BAR_LINE` 等） */
	type?: unknown;
	/** 小節線タイプ（`BarLineType.DOUBLE` 等）。BAR_LINE 要素の場合のみ設定される。 */
	barLineType?: unknown;
	/** 音価（分数表現）。CHORD / REST 要素の場合のみ設定される。 */
	duration?: { numerator: number; denominator: number };
}

/**
 * カーソル
 *
 * `MsScore.newCursor()` で生成し、スコア内の位置を指定してナビゲートする。
 * QML プラグインで `jumpToIssue` 等を実装する際に使用。
 */
export interface MsCursor {
	/** 現在のスタッフインデックス */
	staffIdx: number;
	/** 現在のボイス番号（0–3） */
	voice: number;
	/** 現在の要素。要素がない場合は null。 */
	element: MsElement | null;
	/**
	 * 指定 tick にカーソルを移動する。
	 * @param tick 移動先の tick
	 */
	rewindToTick(tick: number): void;
	/**
	 * 位置定数（`Cursor.SCORE_START` 等）でカーソルを移動する。
	 * @param position Cursor 列挙値
	 */
	rewind(position: number): void;
}
