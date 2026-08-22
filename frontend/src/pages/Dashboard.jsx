import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import api, { getErrorMessage } from "@/api/client";
import Navbar from "@/components/layout/Navbar";
import StatsCards from "@/components/dashboard/StatsCards";
import LinksTable from "@/components/dashboard/LinksTable";
import CreateLinkDialog from "@/components/dashboard/CreateLinkDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const loadLinks = useCallback(async () => {
    try {
      const res = await api.get("/links/");
      setLinks(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not load your links"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  async function handleDelete(link) {
    if (!window.confirm(`Delete /s/${link.short_code}? This also removes its analytics.`)) return;
    try {
      await api.delete(`/links/${link.id}`);
      setLinks((ls) => ls.filter((l) => l.id !== link.id));
      toast.success("Link deleted");
    } catch (err) {
      toast.error(getErrorMessage(err, "Delete failed"));
    }
  }

  function handleCreated(newLink) {
    setLinks((ls) => [newLink, ...ls]);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar onCreate={() => setCreateOpen(true)} />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Every link, every click, one view.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> Create link
          </Button>
        </div>

        <StatsCards links={links} loading={loading} />

        <Card>
          <CardHeader>
            <CardTitle>Your links</CardTitle>
            <CardDescription>Click a short link to open its Link Intelligence dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <LinksTable
              links={links}
              loading={loading}
              onView={(link) => (window.location.href = `/links/${link.id}`)}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>
      </main>

      <CreateLinkDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
    </div>
  );
}