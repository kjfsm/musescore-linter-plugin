import { join } from "node:path";

import { expect, test } from "@playwright/test";

const DUET = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "packages",
  "reader-musicxml",
  "tests",
  "fixtures",
  "duet.musicxml",
);

test("楽譜を読み込んで lint し、プレビューを描いても、外へのリクエストも CSP 違反も 0 件", async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL!).origin;
  const outside: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== origin) outside.push(request.url());
  });
  await page.addInitScript(() => {
    const violations: string[] = [];
    (window as unknown as { __violations: string[] }).__violations = violations;
    document.addEventListener("securitypolicyviolation", (e) => {
      violations.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });

  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain("connect-src 'none'");

  await page.locator('input[type="file"]').setInputFiles(DUET);
  await expect(page.getByText("tie-pitch-mismatch").first()).toBeVisible();

  // OSMD の vendor チャンクはプレビューを開いたときだけ読まれる
  await page.getByText("楽譜プレビュー").first().click();
  await expect(
    page
      .getByLabel(/の楽譜プレビュー$/)
      .locator("svg")
      .first(),
  ).toBeVisible();

  const violations = await page.evaluate(
    () => (window as unknown as { __violations: string[] }).__violations,
  );
  expect(violations).toEqual([]);
  expect(outside).toEqual([]);
});
