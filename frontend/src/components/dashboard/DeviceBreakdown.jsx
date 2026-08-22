import { Monitor, Smartphone, Tablet, Bot } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DEVICE_ICONS = { Desktop: Monitor, Mobile: Smartphone, Tablet: Tablet, Bot: Bot, Unknown: null };

/** Horizontal bar list for any count breakdown (devices, browsers, referrers). */
export function BreakdownBars({ title, description, counts = {}, iconMap = {} }) {
  const entries = Object.entries(counts);
  const max = Math.max(0, ...entries.map(([, v]) => v));
  const total = entries.reduce((s, [, v]) => s + v, 0);

  return (
    <Card data-testid={`breakdown-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!entries.length ? (
          <p className="text-sm text-muted-foreground">No data yet — share your link to collect clicks.</p>
        ) : (
          entries.map(([label, value]) => {
            const Icon = iconMap[label];
            const pct = total ? Math.round((value / total) * 100) : 0;
            return (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                    {label}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {value} · {pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${max ? Math.max(6, (value / max) * 100) : 0}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export default function DeviceBreakdown({ deviceCounts, browserCounts }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <BreakdownBars title="Devices" description="What your audience clicks from" counts={deviceCounts} iconMap={DEVICE_ICONS} />
      <BreakdownBars title="Browsers" description="Where your links get opened" counts={browserCounts} />
    </div>
  );
}