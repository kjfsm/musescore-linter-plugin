import type { Checker, CheckerOptionSpec, CheckerOptionValue } from "@musescore-linter/core";
import { ChevronRight } from "lucide-react";

import { SeverityBadge } from "@/components/SeverityBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { effectiveOptions, isEnabled, type RuleOptions, ruleGroups } from "@/lib/rules";

export interface RulePanelProps {
  enabledRules: Record<string, boolean>;
  onChange: (rules: Record<string, boolean>) => void;
  ruleOptions: RuleOptions;
  onOptionsChange: (options: RuleOptions) => void;
}

/**
 * checker の options 宣言から入力欄を組み立てる。
 *
 * select に Radix の Select を使わないのは、インラインスタイルを注入するため
 * `style-src 'self'` の CSP に引っかかるから（ファイル冒頭のコメントと同じ理由）。
 * ネイティブの `<select>` なら CSP を通る。
 */
function OptionField({
  checker,
  spec,
  value,
  disabled,
  onChange,
}: {
  checker: Checker;
  spec: CheckerOptionSpec;
  value: CheckerOptionValue;
  disabled: boolean;
  onChange: (value: CheckerOptionValue) => void;
}) {
  const id = `rule-${checker.id}-${spec.key}`;

  if (spec.type === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={id}
          checked={value === true}
          disabled={disabled}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
        <label htmlFor={id} className="cursor-pointer text-xs">
          {spec.label}
        </label>
      </div>
    );
  }

  if (spec.type === "select") {
    return (
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="text-xs text-muted-foreground">
          {spec.label}
        </label>
        <select
          id={id}
          className="rounded-md border bg-background px-2 py-1 text-xs"
          value={String(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {spec.choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const selected = Array.isArray(value) ? value : [];
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{spec.label}</span>
      <div className="flex flex-wrap gap-3">
        {spec.choices.map((choice) => (
          <div key={choice.value} className="flex items-center gap-1.5">
            <Checkbox
              id={`${id}-${choice.value}`}
              checked={selected.includes(choice.value)}
              disabled={disabled}
              onCheckedChange={(checked) =>
                onChange(
                  checked === true
                    ? spec.choices
                        .map((c) => c.value)
                        .filter((v) => v === choice.value || selected.includes(v))
                    : selected.filter((v) => v !== choice.value),
                )
              }
            />
            <label htmlFor={`${id}-${choice.value}`} className="cursor-pointer text-xs">
              {choice.label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 折りたたみに Radix の Accordion / Collapsible ではなくネイティブ `<details>` を使っている。
 * Radix はアニメーション用の CSS 変数を style 属性で注入するため、
 * _headers の `style-src 'self'`（'unsafe-inline' なし）に違反してしまう。
 */
export function RulePanel({
  enabledRules,
  onChange,
  ruleOptions,
  onOptionsChange,
}: RulePanelProps) {
  const groups = ruleGroups();
  const all = groups.flatMap((g) => g.checkers);
  const activeCount = all.filter((c) => isEnabled(c, enabledRules)).length;

  function setAll(enabled: boolean) {
    onChange(Object.fromEntries(all.map((c) => [c.id, enabled])));
  }

  function setOption(checker: Checker, key: string, value: CheckerOptionValue) {
    // 既定値との差分に畳むのは保存側（saveRuleOptions）の仕事なので、ここでは素直に上書きする
    onOptionsChange({
      ...ruleOptions,
      [checker.id]: { ...effectiveOptions(checker, ruleOptions), [key]: value },
    });
  }

  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
        チェック項目
        <span className="text-sm font-normal text-muted-foreground">
          {activeCount} / {all.length} 有効
        </span>
      </summary>

      <Separator />

      <div className="flex flex-wrap gap-2 px-4 py-3">
        <Button type="button" size="sm" variant="outline" onClick={() => setAll(true)}>
          すべて有効
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setAll(false)}>
          すべて無効
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            onChange({});
            onOptionsChange({});
          }}
        >
          既定に戻す
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-3 px-4 py-4">
        {groups.map((group) => {
          const activeInGroup = group.checkers.filter((c) => isEnabled(c, enabledRules)).length;
          return (
            <details key={group.category} className="group/cat rounded-lg border" open>
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
                <ChevronRight
                  className="size-3.5 transition-transform group-open/cat:rotate-90"
                  aria-hidden
                />
                {group.label}
                <span className="text-xs font-normal text-muted-foreground">
                  {activeInGroup} / {group.checkers.length} 有効
                </span>
              </summary>
              <ul className="flex flex-col gap-2 px-3 pb-3 pt-1">
                {group.checkers.map((checker) => (
                  <li key={checker.id} className="flex items-start gap-3">
                    <Checkbox
                      id={`rule-${checker.id}`}
                      className="mt-1"
                      checked={isEnabled(checker, enabledRules)}
                      onCheckedChange={(checked) =>
                        onChange({
                          ...enabledRules,
                          [checker.id]: checked === true,
                        })
                      }
                    />
                    <div className="flex flex-col gap-2">
                      <label htmlFor={`rule-${checker.id}`} className="cursor-pointer text-sm">
                        <span className="font-medium">{checker.name}</span>
                        <SeverityBadge severity={checker.severity} className="ml-2" />
                        <span className="block text-muted-foreground">{checker.description}</span>
                      </label>

                      {checker.options &&
                        checker.options.length > 0 && (
                          // 無効なルールでも非表示にはしない。消えると設定が失われたように見える。
                          <div className="flex flex-col gap-2 border-l-2 py-1 pl-3">
                            {checker.options.map((spec) => (
                              <OptionField
                                key={spec.key}
                                checker={checker}
                                spec={spec}
                                value={effectiveOptions(checker, ruleOptions)[spec.key]}
                                disabled={!isEnabled(checker, enabledRules)}
                                onChange={(value) => setOption(checker, spec.key, value)}
                              />
                            ))}
                          </div>
                        )}
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </details>
  );
}
