import {
  definePlugin,
  getMetaTag,
  getSelectionRange,
  iterateMeasures,
  iterateNotes,
} from "@kjfsm/musescore-plugin-sdk-helpers";

// `definePlugin` は QML の `MuseScore { }` オブジェクト（ホスト）を受け取るエントリを作る。
// QML からは `Logic.run(mscore)` のようにホスト自身を渡す。`host.curScore` や `host.Element`
// など API 全体に型付きでアクセスでき、enum の値は実行中の MuseScore が解決する（焼き込みなし）。
export const run = definePlugin({
  run(host) {
    console.log("hello from typescript");
    const score = host.curScore;
    if (!score) {
      console.log("no score is open");
      return;
    }
    const title = getMetaTag(score, "workTitle") ?? "(untitled)";
    console.log(`title: ${title}`);

    const range = getSelectionRange(score);
    console.log(
      range ? `selection: tick ${range.startTick}-${range.endTick}` : "no range selection",
    );

    let measureCount = 0;
    for (const _ of iterateMeasures(score)) measureCount++;
    let noteCount = 0;
    for (const note of iterateNotes(score)) {
      // 焼き込んだ定数ではなく、ホストの実行時 enum で判定する。
      if (note.type === host.Element.NOTE) noteCount++;
    }
    console.log(`measures: ${measureCount}, notes: ${noteCount}`);
  },
});
