/**
 * テンポそのものを指す語。漸次的変化（rit. / accel. / rall.）と「a tempo」「tempo primo」は
 * 含めない — テンポ表記に数えると、BPM の無いテンポ表記として全件が指摘される。
 */
const PRIMARY = new Set([
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
  "lent",
  "vite",
  "modéré",
  "modere",
  "animé",
  "anime",
  "rapide",
  "vif",
]);

/** 「Molto allegro」の molto のように、テンポ語の前に付く修飾語。 */
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

// \p{Letter} は ES2018 の正規表現で、プラグインの QML エンジンでは使えない。
// テンポ語に現れるのはラテン文字と Latin-1 の母音符号・ß だけなので、その範囲で語を切る。
const NON_WORD = /[^a-zß-öø-ÿœ']+/;

/**
 * テンポ語で始まるテキストなら、その語を返す。先頭が修飾語の並びなら、その直後の語を見る。
 *
 * 語のどこかにテンポ語があれば、という判定にはしない。表情記号の中にたまたま含まれる
 * だけのものを拾ってしまう（テンポ表記は必ず先頭に来る）。
 */
export function leadingTempoWord(text: string): string | null {
  const words = text
    .toLowerCase()
    .split(NON_WORD)
    .filter((w) => w !== "");
  for (const word of words.slice(0, MAX_MODIFIERS + 1)) {
    if (PRIMARY.has(word)) return word;
    if (!MODIFIERS.has(word)) return null;
  }
  return null;
}
