import type { ReportedIssue, Settings, SnapshotWriter } from "@score-linter/lint-app";
import { createSnapshotWriter } from "@score-linter/lint-app";
import type { Severity } from "@score-linter/linter";
import type { MuseScore } from "@score-linter/musescore-api-types";

import { type LintRun, lintCurrentScore } from "./lint.ts";
import { isNewerVersion } from "./version.ts";

export interface RunView {
  issues: ReportedIssue[];
  counts: Record<Severity, number>;
  /** 失敗したときは null。ジャンプとスナップショットはこれを使う。 */
  run: LintRun | null;
  /** 計測を頼まれたときだけ埋まる。 */
  perfText: string;
}

function internalIssue(message: string): ReportedIssue {
  return {
    ruleId: "internal",
    severity: "error",
    category: "internal",
    message,
    partId: null,
    partName: "",
    staffIdx: -1,
    measure: 0,
    measureLabel: "",
    tick: 0,
    detail: null,
  };
}

function failed(message: string): RunView {
  return {
    issues: [internalIssue(message)],
    counts: { error: 1, warning: 0, info: 0 },
    run: null,
    perfText: "",
  };
}

function formatPerf(totalMs: number, gcMs: number, lintMs: number, detail: string): string {
  // ラベルは桁を揃えるため ASCII のみ（monospace 表示なので全角が混ざるとずれる）
  const lines = [
    "[ScoreLinter:runLinter]",
    `  total             ${totalMs} ms`,
    `  gc                ${gcMs} ms`,
    `  lintCurrentScore  ${lintMs} ms`,
  ];
  if (detail.length > 0) lines.push("", detail);
  return lines.join("\n");
}

export interface RunRequest {
  settings: Settings;
  measure: boolean;
  /** QML が gc() に使った時間。gc は QML のグローバルにしか無い。 */
  gcMs: number;
  /** QML が実行を始めた時刻（Date.now()）。gc の時間も全体に含める。 */
  startedAt: number;
}

export function runLint(host: MuseScore, request: RunRequest): RunView {
  if (!host.curScore) return failed("スコアが開かれていません");
  try {
    const lintStarted = Date.now();
    const run = lintCurrentScore(host, request.settings, request.measure);
    const now = Date.now();
    return {
      issues: run.issues,
      counts: run.counts,
      run,
      perfText: request.measure
        ? formatPerf(now - request.startedAt, request.gcMs, now - lintStarted, run.perfText)
        : "",
    };
  } catch (error) {
    // ホストの UI 層なので、読み取りの失敗も指摘として見せて続ける（catch してはいけないのはルールの run の中だけ）
    return failed(`実行中にエラーが発生しました: ${error}`);
  }
}

export interface SnapshotProgress {
  building: boolean;
  done: number;
  total: number;
  /** 生成し終えたか、失敗したときの文面。それまでは空。 */
  text: string;
  buildMs: number;
}

/**
 * スナップショットの JSON を、QML の Timer から少しずつ作る。
 * QML のエンジンの JSON.stringify は大きな楽譜で数秒かかるので、タブを開いたときだけ作り、離れたら止める。
 */
export interface SnapshotSession {
  progress(): SnapshotProgress;
  /** 生成済み・生成中・未実行のいずれかなら何もせず false。 */
  start(run: LintRun | null): boolean;
  cancel(): void;
  /** 最大 `chunk` 個進める。書き終えたか失敗したら true（Timer を止める合図）。 */
  step(chunk: number): boolean;
  /** 次の実行の前に、前回の文面ごと手放す。 */
  reset(): void;
}

const IDLE: SnapshotProgress = { building: false, done: 0, total: 0, text: "", buildMs: 0 };

export function createSnapshotSession(): SnapshotSession {
  let writer: SnapshotWriter | null = null;
  let startedAt = 0;
  let state = IDLE;

  const cancel = () => {
    if (!state.building) return;
    writer = null;
    state = { ...state, building: false, done: 0, total: 0 };
  };

  return {
    progress: () => state,
    start(run) {
      if (state.building || state.text.length > 0 || !run) return false;
      writer = createSnapshotWriter(run.score);
      startedAt = Date.now();
      state = { building: true, done: 0, total: writer.total, text: "", buildMs: 0 };
      return true;
    },
    cancel,
    step(chunk) {
      if (!writer) {
        cancel();
        return true;
      }
      try {
        const finished = writer.step(chunk);
        state = { ...state, done: writer.done };
        if (!finished) return false;
        state = {
          ...state,
          building: false,
          text: writer.text(),
          buildMs: Date.now() - startedAt,
        };
        writer = null;
        return true;
      } catch (error) {
        cancel();
        state = { ...state, text: `スナップショットの生成に失敗しました: ${error}` };
        return true;
      }
    },
    reset() {
      writer = null;
      state = IDLE;
    },
  };
}

export type UpdateState = "idle" | "checking" | "upToDate" | "available" | "error";

export interface UpdateView {
  state: UpdateState;
  latestVersion: string;
  message: string;
}

export function releasesApiUrl(repoSlug: string): string {
  return `https://api.github.com/repos/${repoSlug}/releases/latest`;
}

/** 通信そのものは QML の XMLHttpRequest が行う。 */
export function readLatestRelease(
  status: number,
  body: string,
  currentVersion: string,
): UpdateView {
  const error = (message: string): UpdateView => ({ state: "error", latestVersion: "", message });
  if (status !== 200) {
    return error(`更新を確認できませんでした (HTTP ${status})。時間をおいて再度お試しください。`);
  }
  let tag = "";
  try {
    const data = JSON.parse(body) as { tag_name?: unknown } | null;
    tag = data && data.tag_name ? String(data.tag_name) : "";
  } catch {
    return error("応答の解析に失敗しました。");
  }
  if (tag.length === 0) return error("最新バージョン情報を取得できませんでした。");
  return {
    state: isNewerVersion(currentVersion, tag) ? "available" : "upToDate",
    latestVersion: tag,
    message: "",
  };
}
