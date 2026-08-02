import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { isEnabled, ruleGroups } from "@/lib/rules";

export interface RulePanelProps {
  enabledRules: Record<string, boolean>;
  onChange: (rules: Record<string, boolean>) => void;
}

/**
 * 折りたたみに Radix の Accordion / Collapsible ではなくネイティブ `<details>` を使っている。
 * Radix はアニメーション用の CSS 変数を style 属性で注入するため、
 * _headers の `style-src 'self'`（'unsafe-inline' なし）に違反してしまう。
 */
export function RulePanel({ enabledRules, onChange }: RulePanelProps) {
  const groups = ruleGroups();
  const all = groups.flatMap((g) => g.checkers);
  const activeCount = all.filter((c) => isEnabled(c, enabledRules)).length;

  function setAll(enabled: boolean) {
    onChange(Object.fromEntries(all.map((c) => [c.id, enabled])));
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
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange({})}>
          既定に戻す
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-6 px-4 py-4">
        {groups.map((group) => (
          <section key={group.category} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">{group.label}</h3>
            <ul className="flex flex-col gap-2">
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
                  <label htmlFor={`rule-${checker.id}`} className="cursor-pointer text-sm">
                    <span className="font-medium">{checker.name}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {checker.id}
                    </span>
                    <span className="block text-muted-foreground">{checker.description}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}
