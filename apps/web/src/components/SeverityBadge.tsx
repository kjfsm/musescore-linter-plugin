import type { Severity } from "@musescore-linter/core";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const SEVERITY_VARIANT: Record<Severity, "destructive" | "secondary" | "ghost"> = {
  error: "destructive",
  warning: "secondary",
  info: "ghost",
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const Icon = severity === "error" ? CircleAlert : severity === "warning" ? TriangleAlert : Info;
  return (
    <Badge variant={SEVERITY_VARIANT[severity]} className={className}>
      <Icon aria-hidden />
      {severity}
    </Badge>
  );
}
