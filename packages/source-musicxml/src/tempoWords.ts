// MusicXML の `<words>` は要素の種類を持たないので、テンポ表記かどうかはテキストから
// 判断するしかない。MuseScore 経路は `isTempo(ann)`（要素型）で判定できるため、
// この語彙表は MusicXML 経路に固有の埋め合わせ。
//
// `<sound tempo>` も `<metronome>` も無い「Allegro」だけの direction を STAFF_TEXT に
// 落としていると、opening-tempo（severity=error・既定 ON）が「冒頭にテンポ表記が
// ありません」と誤報する。Sibelius / Finale が書き出す MusicXML では珍しくない。

/**
 * テンポそのものを指す語。漸次的変化（rit. / accel. / rall.）は含めない
 * ——それらは tempo-change-resolution が STAFF_TEXT のまま扱っており、
 * TEMPO_TEXT に昇格させると tempo-without-bpm が全件に反応してしまう。
 * 「a tempo」「tempo primo」も同じ理由で入れない。
 */
const PRIMARY = new Set([
  // イタリア語
  "grave",
  "largo",
  "larghetto",
  "larghissimo",
  "lento",
  "lentamente",
  "adagio",
  "adagietto",
  "andante",
  "andantino",
  "moderato",
  "allegretto",
  "allegro",
  "allegrissimo",
  "vivace",
  "vivacissimo",
  "vivo",
  "presto",
  "prestissimo",
  "mosso",
  "sostenuto",
  "maestoso",
  // ドイツ語
  "langsam",
  "schnell",
  "mäßig",
  "massig",
  "lebhaft",
  "bewegt",
  "ruhig",
  "geschwind",
  "gemächlich",
  "feierlich",
  // フランス語
  "lent",
  "vite",
  "modéré",
  "modere",
  "animé",
  "anime",
  "rapide",
  "vif",
]);

/**
 * 「Molto allegro」「Un poco adagio」のように、テンポ語の前に付く修飾語。
 * これ自体はテンポ語ではないので、後ろにテンポ語が来て初めて意味を持つ。
 */
const MODIFIERS = new Set([
  "molto",
  "poco",
  "un",
  "più",
  "piu",
  "meno",
  "assai",
  "non",
  "troppo",
  "sempre",
  "quasi",
  "ma",
  "e",
  "tanto",
  "abbastanza",
  "sehr",
  "ziemlich",
  "etwas",
  "nicht",
  "zu",
  "très",
  "tres",
  "assez",
  "peu",
  "very",
  "rather",
]);

/** 先頭からいくつの修飾語を読み飛ばすか。「Un poco piu allegro」で 3。 */
const MAX_MODIFIERS = 3;

function tokenize(text: string): string[] {
  // 記号・数字を落として語だけにする。ラテン文字の合字や母音符号は残す。
  return text
    .toLowerCase()
    .split(/[^\p{Letter}']+/u)
    .filter((w) => w !== "");
}

/**
 * テンポ表記らしいテキストか。先頭の語がテンポ語であるか、
 * 先頭が修飾語の並びで、その直後にテンポ語が来る場合に真。
 *
 * 語のどこかにテンポ語があれば真、という判定にはしない。表情記号の中に
 * たまたま含まれるだけのものを拾ってしまうため（テンポ表記は必ず先頭に来る）。
 */
export function looksLikeTempoText(text: string): boolean {
  const words = tokenize(text);
  for (let i = 0; i < words.length && i <= MAX_MODIFIERS; i++) {
    if (PRIMARY.has(words[i])) return true;
    if (!MODIFIERS.has(words[i])) return false;
  }
  return false;
}
