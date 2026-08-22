import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Download, QrCode, RefreshCw } from "lucide-react";
import api, { getErrorMessage } from "@/api/client";
import Navbar from "@/components/layout/Navbar";
import ClicksChart from "@/components/dashboard/ClicksChart";
import ClickHeatmap from "@/components/dashboard/ClickHeatmap";
import DeviceBreakdown, { BreakdownBars } from "@/components/dashboard/DeviceBreakdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function LinkDetail() {
  const { id } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/links/${id}/analytics`, { params: { days } });
      setAnalytics(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not load analytics"));
    } finally {
      setLoading(false);
    }
  }, [id, days]);

  useEffect(() => {
    loadAnalytics();
    // Poll every 15s so the dashboard feels live
    const timer = setInterval(loadAnalytics, 15000);
    return () => clearInterval(timer);
  }, [loadAnalytics]);

  // QR codes are owner-only on the API, so they must be fetched WITH the
  // bearer token and displayed from a local blob URL.
  useEffect(() => {
    let objectUrl;
    api
      .get(`/links/${id}/qr`, { responseType: "blob" })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data);
        setQrUrl(objectUrl);
      })
      .catch(() => setQrUrl(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  // Same rule for the CSV: window.open() cannot send the Authorization
  // header, so fetch it as an authenticated blob and trigger a download.
  async function exportCsv(link) {
    try {
      const res = await api.get(`/links/${link.id}/export`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nexuslinks-${link.short_code}-clicks.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not export CSV"));
    }
  }

  function downloadQr() {
    if (!qrUrl || !analytics) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `nexuslinks-${analytics.link.short_code}-qr.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-48 w-full" />
        </main>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Link not found</CardTitle>
              <CardDescription>It may have been deleted or belongs to another account.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link to="/dashboard">
                  <ArrowLeft /> Back to dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const { link } = analytics;
  const shortUrl = `${API_BASE_URL.replace(/\/$/, "")}/${link.short_code}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1">
              <Link to="/dashboard">
                <ArrowLeft /> Dashboard
              </Link>
            </Button>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              /{link.short_code}
              <Badge variant={link.expires_at && new Date(link.expires_at) < new Date() ? "destructive" : "success"}>
                {link.expires_at && new Date(link.expires_at) < new Date() ? "Expired" : "Active"}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              → {link.target_url} · created {new Date(link.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(shortUrl).then(() => toast.success("Copied!"))}>
              Copy short link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv(link)}
            >
              <Download /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={loadAnalytics}>
              <RefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Window:</span>
          {[7, 30, 90].map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>
              {d}d
            </Button>
          ))}
          <span className="ml-auto text-sm text-muted-foreground">
            <strong className="text-foreground">{analytics.total_clicks}</strong> total clicks · auto-refreshes
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="space-y-6">
            <ClicksChart data={analytics.daily_clicks} />
            <ClickHeatmap heatmap={analytics.heatmap} />
            <DeviceBreakdown deviceCounts={analytics.device_counts} browserCounts={analytics.browser_counts} />
            <BreakdownBars
              title="Traffic sources"
              description="Where your clicks are coming from"
              counts={analytics.referrer_counts}
            />
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode /> QR code
              </CardTitle>
              <CardDescription>Scan to open /{link.short_code}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {qrUrl ? (
                <>
                  <img
                    src={qrUrl}
                    alt={`QR code for ${shortUrl}`}
                    className="mx-auto w-full max-w-[200px] rounded-lg border bg-white p-2"
                  />
                  <Button variant="outline" size="sm" className="w-full" onClick={downloadQr}>
                    <Download /> Download QR
                  </Button>
                </>
              ) : (
                <p className="text-center text-sm text-muted-foreground">QR code unavailable</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}