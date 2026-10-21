import type { OptionInfo, RuleInfo, Settings } from "@score-linter/lint-app";
import type { OptionValue, Preset, RuleCategory } from "@score-linter/linter";
import { ChevronRight } from "lucide-react";
import type { MouseEvent } from "react";

import { SeverityBadge } from "@/components/SeverityBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { app } from "@/lib/lint";

export interface RulePanelProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

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

function RuleItem({
  rule,
  settings,
  enabled,
  optionValues,
  onChange,
}: {
  rule: RuleInfo;
  settings: Settings;
  enabled: boolean;
  optionValues: Record<string, OptionValue>;
  onChange: (settings: Settings) => void;
}) {
  return (
    <li className="flex items-start gap-3">
      <Checkbox
        id={`rule-${rule.id}`}
        className="mt-1"
        checked={enabled}
        onCheckedChange={(checked) =>
          onChange(app.withRuleEnabled(settings, rule.id, checked === true))
        }
      />
      <div className="flex flex-col gap-2">
        <label htmlFor={`rule-${rule.id}`} className="cursor-pointer text-sm">
          <span className="font-medium">{rule.name}</span>
          <SeverityBadge severity={rule.severity} className="ml-2" />
          {rule.tier === "pedantic" && (
            <Badge variant="outline" className="ml-1">
              細かい指摘
            </Badge>
          )}
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
                value={optionValues[spec.key]}
                disabled={!enabled}
                onChange={(value) =>
                  onChange(app.withRuleOption(settings, rule.id, spec.key, value))
                }
              />
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: "recommended", label: "推奨のみ" },
  { value: "all", label: "すべて（細かい指摘を含む）" },
];

/**
 * 折りたたみに Radix の Accordion / Collapsible ではなくネイティブ `<details>` を使っている。
 * Radix はアニメーション用の CSS 変数を style 属性で注入するため、
 * _headers の `style-src 'self'`（'unsafe-inline' なし）に違反してしまう。
 */
export function RulePanel({ settings, onChange }: RulePanelProps) {
  const { groups, nursery } = app.catalog;
  const all = [...groups.flatMap((g) => g.rules), ...nursery];
  const view = app.settingsView(settings);
  const isEnabled = (rule: RuleInfo) => view.enabled[rule.id] === true;
  const countText = (rules: readonly RuleInfo[]) =>
    `${rules.filter(isEnabled).length} / ${rules.length} 有効`;

  const setGroup =
    (category: RuleCategory, enabled: boolean) => (e: MouseEvent<HTMLButtonElement>) => {
      // summary の中なので、押しても欄を開閉させない
      e.preventDefault();
      onChange(app.withGroupEnabled(settings, category, enabled));
    };

  const item = (rule: RuleInfo) => (
    <RuleItem
      key={rule.id}
      rule={rule}
      settings={settings}
      enabled={isEnabled(rule)}
      optionValues={view.options[rule.id] ?? {}}
      onChange={onChange}
    />
  );

  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
        チェック項目
        <span className="text-sm font-normal text-muted-foreground">{countText(all)}</span>
      </summary>

      <Separator />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <legend className="sr-only">プリセット</legend>
          {PRESETS.map(({ value, label }) => (
            <label key={value} className="flex cursor-pointer items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="rule-preset"
                value={value}
                checked={settings.preset === value}
                onChange={() => onChange(app.withPreset(settings, value))}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          // プリセットは利用者が選んだものなので、戻すのはそのもとでの個別の設定だけ
          onClick={() => onChange({ preset: settings.preset, enabled: {}, options: {} })}
        >
          既定に戻す
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-3 px-4 py-4">
        {groups.map((group) => (
          <details key={group.category} className="group/cat rounded-lg border" open>
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <ChevronRight
                className="size-3.5 transition-transform group-open/cat:rotate-90"
                aria-hidden
              />
              {group.label}
              <span className="text-xs font-normal text-muted-foreground">
                {countText(group.rules)}
              </span>
              <span className="ml-auto flex gap-1">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={setGroup(group.category, true)}
                >
                  すべて ON
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={setGroup(group.category, false)}
                >
                  すべて OFF
                </Button>
              </span>
            </summary>
            <ul className="flex flex-col gap-2 px-3 pb-3 pt-1">{group.rules.map(item)}</ul>
          </details>
        ))}

        {nursery.length > 0 && (
          <details className="group/cat rounded-lg border border-dashed">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <ChevronRight
                className="size-3.5 transition-transform group-open/cat:rotate-90"
                aria-hidden
              />
              試験中
              <span className="text-xs font-normal text-muted-foreground">
                {countText(nursery)}
              </span>
            </summary>
            <p className="px-3 text-xs text-muted-foreground">
              誤検出の様子を見ているチェックです。どのプリセットにも含まれないので、試すときは 1
              つずつ ON にしてください。
            </p>
            <ul className="flex flex-col gap-2 px-3 pb-3 pt-2">{nursery.map(item)}</ul>
          </details>
        )}
      </div>
    </details>
  );
}
