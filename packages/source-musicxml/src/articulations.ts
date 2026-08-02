/**
 * MusicXML の `<notations><articulations>` / `<technical>` / `<ornaments>` の要素名を
 * MuseScore のアーティキュレーション名に対応づける。
 *
 * MuseScore の `subtypeName()` は UI 言語に依存した名前（日本語環境では「上スタッカート」等）を
 * 返すため、MuseScore 経路と MusicXML 経路で文字列そのものは一致しない。この値を使う
 * `slur-tie-articulation-consistency` は**同一 IR 内のパート間比較**にしか使わないので、
 * 表記が内部で一貫していれば判定結果は変わらない。
 */
const ARTICULATION_NAMES: Record<string, string> = {
	// <articulations>
	accent: "Accent",
	"strong-accent": "Marcato",
	staccato: "Staccato",
	tenuto: "Tenuto",
	detached: "Portato",
	"detached-legato": "Portato",
	staccatissimo: "Staccatissimo",
	spiccato: "Staccatissimo",
	scoop: "Scoop",
	plop: "Plop",
	doit: "Doit",
	falloff: "Falloff",
	stress: "Stress",
	unstress: "Unstress",
	"soft-accent": "SoftAccent",
	// <technical>
	"up-bow": "UpBow",
	"down-bow": "DownBow",
	harmonic: "Harmonic",
	"open-string": "Open",
	open: "Open",
	stopped: "Stopped",
	"snap-pizzicato": "SnapPizzicato",
	thumb: "ThumbPosition",
	// <ornaments>
	trill: "Trill",
	"trill-mark": "Trill",
	turn: "Turn",
	"inverted-turn": "InvertedTurn",
	mordent: "Mordent",
	"inverted-mordent": "InvertedMordent",
	tremolo: "Tremolo",
	schleifer: "Schleifer",
	"wavy-line": "Trill",
	// <fermata> は <notations> 直下
	fermata: "Fermata",
};

export function articulationNameOf(tag: string): string | undefined {
	return ARTICULATION_NAMES[tag];
}
