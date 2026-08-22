import { Link2, MousePointerClick, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/utils";

export function StatsCard({ title, value, icon: Icon, hint, loading }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{formatCount(value)}</div>
        )}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function StatsCards({ links = [], loading = false }) {
  const totalLinks = links.length;
  const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0);
  const bestLink = links.reduce(
    (best, l) => ((l.clicks || 0) > (best?.clicks || -1) ? l : best),
    null
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="stats-cards">
      <StatsCard title="Total Links" value={totalLinks} icon={Link2} loading={loading} hint="Created by you" />
      <StatsCard title="Total Clicks" value={totalClicks} icon={MousePointerClick} loading={loading} hint="All time" />
      <StatsCard
        title="Top Link"
        value={bestLink ? bestLink.clicks : 0}
        icon={TrendingUp}
        loading={loading}
        hint={bestLink ? bestLink.short_code : "No links yet"}
      />
      <StatsCard
        title="Avg Clicks / Link"
        value={totalLinks ? Math.round(totalClicks / totalLinks) : 0}
        icon={Zap}
        loading={loading}
        hint="Across your links"
      />
    </div>
  );
}