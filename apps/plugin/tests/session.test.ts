import type { Settings } from "@score-linter/lint-app";
import type { MuseScore } from "@score-linter/musescore-api-types";
import { duetScore, host } from "@score-linter/reader-musescore/testing";
import { describe, expect, it } from "vitest";

import { createSnapshotSession, readLatestRelease, runLint } from "../src/session.ts";

const NO_SETTINGS: Settings = { preset: "recommended", enabled: {}, options: {} };
const request = { settings: NO_SETTINGS, measure: false, gcMs: 0, startedAt: Date.now() };
const withScore = (): MuseScore => ({ ...host, curScore: duetScore() }) as unknown as MuseScore;

describe("runLint", () => {
  it("スコアが無ければ内部エラーの指摘 1 件だけを返す", () => {
    const view = runLint({ ...host, curScore: null } as unknown as MuseScore, request);
    expect(view.run).toBeNull();
    expect(view.counts).toEqual({ error: 1, warning: 0, info: 0 });
    expect(view.issues).toMatchObject([
      { ruleId: "internal", message: "スコアが開かれていません" },
    ]);
  });

  it("読み取りが例外を投げても、内部エラーの指摘にして返す", () => {
    const broken = {
      ...host,
      get curScore() {
        return {
          get parts() {
            throw new Error("boom");
          },
        };
      },
    } as unknown as MuseScore;
    const view = runLint(broken, request);
    expect(view.run).toBeNull();
    expect(view.issues[0]!.message).toContain("boom");
  });

  it("計測を頼んだときだけ、全体・gc・lint の内訳を返す", () => {
    expect(runLint(withScore(), request).perfText).toBe("");
    const measured = runLint(withScore(), { ...request, measure: true, gcMs: 3 });
    expect(measured.perfText).toContain("gc                3 ms");
    expect(measured.perfText).toContain("readMuseScore");
  });
});

describe("createSnapshotSession", () => {
  const run = runLint(withScore(), request).run;

  it("start してから step を繰り返すと、Score の JSON ができる", () => {
    const session = createSnapshotSession();
    expect(session.start(run)).toBe(true);
    while (!session.step(10)) expect(session.progress().building).toBe(true);
    const { building, text, done, total } = session.progress();
    expect(building).toBe(false);
    expect(done).toBe(total);
    expect(JSON.parse(text)).toEqual(JSON.parse(JSON.stringify(run!.score)));
  });

  it("実行前・生成済みなら start しない", () => {
    const session = createSnapshotSession();
    expect(session.start(null)).toBe(false);
    session.start(run);
    while (!session.step(1000));
    expect(session.start(run)).toBe(false);
    session.reset();
    expect(session.start(run)).toBe(true);
  });

  it("cancel すると途中まで書いた分を捨て、次の start で頭からやり直す", () => {
    const session = createSnapshotSession();
    session.start(run);
    session.step(1);
    session.cancel();
    expect(session.progress()).toMatchObject({ building: false, done: 0, text: "" });
    expect(session.start(run)).toBe(true);
    expect(session.progress().done).toBe(0);
  });
});

describe("readLatestRelease", () => {
  const body = (tag: unknown) => JSON.stringify({ tag_name: tag });

  it("新しい版があれば available、同じか古ければ upToDate", () => {
    expect(readLatestRelease(200, body("v2.6.0"), "2.5.0")).toEqual({
      state: "available",
      latestVersion: "v2.6.0",
      message: "",
    });
    expect(readLatestRelease(200, body("v2.5.0"), "2.5.0").state).toBe("upToDate");
  });

  it.each([
    [404, body("v1"), "HTTP 404"],
    [200, "{", "解析に失敗"],
    [200, body(""), "取得できませんでした"],
    [200, "null", "取得できませんでした"],
  ])("status %i・本文 %s は error にし、理由を出す", (status, text, reason) => {
    const view = readLatestRelease(status, text, "2.5.0");
    expect(view.state).toBe("error");
    expect(view.message).toContain(reason);
  });
});
