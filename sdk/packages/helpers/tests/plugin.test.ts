import type { MuseScore } from "@kjfsm/musescore-plugin-sdk-types";
import { generatedFrom } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it, vi } from "vitest";
import { assertHostVersion, checkHostVersion, definePlugin, strictEnum } from "../src/plugin.js";

// generatedFrom.tag（例 "v4.7.3"）から major/minor を取り出す。
const m = /v?(\d+)\.(\d+)/.exec(generatedFrom.tag);
const MAJOR = Number(m?.[1]);
const MINOR = Number(m?.[2]);

function mockHost(major: number, minor: number): MuseScore {
  return {
    mscoreMajorVersion: major,
    mscoreMinorVersion: minor,
    log: vi.fn(),
  } as unknown as MuseScore;
}

describe("definePlugin", () => {
  it("passes the host to run when versions match", () => {
    const host = mockHost(MAJOR, MINOR);
    const run = vi.fn();
    definePlugin({ run })(host);
    expect(run).toHaveBeenCalledWith(host);
  });

  it("logs (not throws) on mismatch by default", () => {
    const host = mockHost(MAJOR - 1, MINOR);
    const run = vi.fn();
    definePlugin({ run })(host);
    expect(host.log).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledOnce();
  });

  it("throws before run when onVersionMismatch is 'throw'", () => {
    const host = mockHost(MAJOR, MINOR + 1);
    const run = vi.fn();
    expect(() => definePlugin({ run, onVersionMismatch: "throw" })(host)).toThrow(
      /バージョン不一致/,
    );
    expect(run).not.toHaveBeenCalled();
  });

  it("ignores mismatch when onVersionMismatch is 'ignore'", () => {
    const host = mockHost(MAJOR + 1, MINOR);
    definePlugin({ run: vi.fn(), onVersionMismatch: "ignore" })(host);
    expect(host.log).not.toHaveBeenCalled();
  });
});

describe("checkHostVersion / assertHostVersion", () => {
  it("ok when major/minor match", () => {
    const host = mockHost(MAJOR, MINOR);
    expect(checkHostVersion(host).ok).toBe(true);
    expect(() => assertHostVersion(host)).not.toThrow();
  });

  it("not ok with a message on mismatch", () => {
    const host = mockHost(MAJOR, MINOR + 1);
    const check = checkHostVersion(host);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.message).toMatch(/バージョン不一致/);
    expect(() => assertHostVersion(host)).toThrow(/バージョン不一致/);
  });
});

describe("strictEnum", () => {
  it("returns existing members and throws on missing ones", () => {
    const E = strictEnum("Element", { NOTE: 28 });
    expect(E.NOTE).toBe(28);
    // @ts-expect-error 存在しないメンバへのアクセス
    expect(() => E.NOPE).toThrow(/存在しません/);
  });
});
