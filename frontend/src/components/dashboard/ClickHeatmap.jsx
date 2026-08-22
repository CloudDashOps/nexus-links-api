import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCount } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function shade(intensity, max) {
  if (!max) return "bg-muted";
  const ratio = intensity / max;
  if (ratio === 0) return "bg-muted";
  if (ratio < 0.25) return "bg-primary/20";
  if (ratio < 0.5) return "bg-primary/40";
  if (ratio < 0.75) return "bg-primary/60";
  return "bg-primary/80";
}

/** Weekday x hour heatmap of when your audience clicks. */
export default function ClickHeatmap({ heatmap = {} }) {
  const max = Math.max(0, ...Object.values(heatmap));

  return (
    <Card data-testid="click-heatmap">
      <CardHeader>
        <CardTitle>When your audience clicks</CardTitle>
        <CardDescription>Weekday × hour (UTC). Darker = more clicks — schedule posts at your hottest cells.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="inline-block min-w-[560px]">
          <div className="flex">
            <div className="w-9" />
            {HOURS.map((h) => (
              <div key={h} className="w-4 text-center text-[8px] text-muted-foreground">
                {h % 3 === 0 ? h : ""}
              </div>
            ))}
          </div>
          {WEEKDAYS.map((day) => (
            <div key={day} className="flex items-center">
              <div className="w-9 text-[10px] font-medium text-muted-foreground">{day}</div>
              {HOURS.map((hour) => {
                const count = heatmap[`${day}-${hour}`] || 0;
                return (
                  <div
                    key={hour}
                    title={`${day} ${String(hour).padStart(2, "0")}:00 — ${formatCount(count)} clicks`}
                    className={cn("m-px h-4 w-3 rounded-sm", shade(count, max))}
                  />
                );
              })}
            </div>
          ))}
          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
            Less
            <span className="m-px h-3 w-3 rounded-sm bg-muted" />
            <span className="m-px h-3 w-3 rounded-sm bg-primary/20" />
            <span className="m-px h-3 w-3 rounded-sm bg-primary/40" />
            <span className="m-px h-3 w-3 rounded-sm bg-primary/60" />
            <span className="m-px h-3 w-3 rounded-sm bg-primary/80" />
            More
          </div>
        </div>
      </CardContent>
    </Card>
  );
}