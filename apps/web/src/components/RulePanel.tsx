import {
  type OptionInfo,
  type RuleInfo,
  ruleGroups,
  ruleOptionValues,
  type Settings,
  withRuleEnabled,
  withRuleOption,
} from "@score-linter/lint-app";
import type { OptionValue } from "@score-linter/linter";
import { ChevronRight } from "lucide-react";

import { SeverityBadge } from "@/components/SeverityBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { rules } from "@/lib/lint";

export interface RulePanelProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

const ruleById = new Map(rules.map((r) => [r.id, r]));

/**
 * select に Radix の Select を使わないのは、インラインスタイルを注入するため
 * `style-src 'self'` の CSP に引っかかるから（ファイル冒頭のコメントと同じ理由）。
 * ネイティブの `<select>` なら CSP を通る。
 */
function OptionField({
  rule,
  spec,
  value,
  disabled,
  onChange,
}: {
  rule: RuleInfo;
  spec: OptionInfo;
  value: OptionValue | undefined;
  disabled: boolean;
  onChange: (value: OptionValue) => void;
}) {
  const id = `rule-${rule.id}-${spec.key}`;

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
export function RulePanel({ settings, onChange }: RulePanelProps) {
  const groups = ruleGroups(rules);
  const all = groups.flatMap((g) => g.rules);
  const isEnabled = (rule: RuleInfo) => settings.enabled[rule.id] ?? rule.defaultEnabled;
  const activeCount = all.filter(isEnabled).length;

  function setAll(enabled: boolean) {
    onChange(all.reduce((s, r) => withRuleEnabled(rules, s, r.id, enabled), settings));
  }

  const optionValues = (rule: RuleInfo) => {
    const found = ruleById.get(rule.id);
    return found ? ruleOptionValues(found, settings) : {};
  };

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
          onClick={() => onChange({ enabled: {}, options: {} })}
        >
          既定に戻す
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-3 px-4 py-4">
        {groups.map((group) => {
          const activeInGroup = group.rules.filter(isEnabled).length;
          return (
            <details key={group.category} className="group/cat rounded-lg border" open>
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
                <ChevronRight
                  className="size-3.5 transition-transform group-open/cat:rotate-90"
                  aria-hidden
                />
                {group.label}
                <span className="text-xs font-normal text-muted-foreground">
                  {activeInGroup} / {group.rules.length} 有効
                </span>
              </summary>
              <ul className="flex flex-col gap-2 px-3 pb-3 pt-1">
                {group.rules.map((rule) => (
                  <li key={rule.id} className="flex items-start gap-3">
                    <Checkbox
                      id={`rule-${rule.id}`}
                      className="mt-1"
                      checked={isEnabled(rule)}
                      onCheckedChange={(checked) =>
                        onChange(withRuleEnabled(rules, settings, rule.id, checked === true))
                      }
                    />
                    <div className="flex flex-col gap-2">
                      <label htmlFor={`rule-${rule.id}`} className="cursor-pointer text-sm">
                        <span className="font-medium">{rule.name}</span>
                        <SeverityBadge severity={rule.severity} className="ml-2" />
                        <span className="block text-muted-foreground">{rule.description}</span>
                      </label>

                      {rule.options.length > 0 && (
                        // 無効なルールでも非表示にはしない。消えると設定が失われたように見える。
                        <div className="flex flex-col gap-2 border-l-2 py-1 pl-3">
                          {rule.options.map((spec) => (
                            <OptionField
                              key={spec.key}
                              rule={rule}
                              spec={spec}
                              value={optionValues(rule)[spec.key]}
                              disabled={!isEnabled(rule)}
                              onChange={(value) =>
                                onChange(withRuleOption(rules, settings, rule.id, spec.key, value))
                              }
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
