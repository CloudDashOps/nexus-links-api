import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api, { getErrorMessage } from "@/api/client";

const EMPTY_FORM = {
  target_url: "",
  title: "",
  custom_slug: "",
  expires_at: "",
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
};

/** Create-link dialog with a built-in UTM campaign builder. */
export default function CreateLinkDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showUtm, setShowUtm] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.target_url.trim()) {
      toast.error("A destination URL is required");
      return;
    }
    setSaving(true);
    try {
      // Compose UTM parameters into the destination before sending
      let target = form.target_url.trim();
      // People type "github.com/x" all the time; the backend only accepts
      // absolute http(s) URLs, so add the scheme instead of failing 422.
      if (target && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) {
        target = `https://${target}`;
      }
      if (showUtm) {
        try {
          const url = new URL(target);
          const pairs = [
            ["utm_source", form.utm_source],
            ["utm_medium", form.utm_medium],
            ["utm_campaign", form.utm_campaign],
          ];
          for (const [k, v] of pairs) {
            if (v.trim()) url.searchParams.set(k, v.trim());
          }
          target = url.toString();
        } catch {
          /* leave as-is; backend validates */
        }
      }

      const payload = {
        target_url: target,
        title: form.title || undefined,
        custom_slug: form.custom_slug || undefined,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
      };
      const res = await api.post("/links/", payload);
      toast.success("Link created!");
      onCreated?.(res.data);
      setForm(EMPTY_FORM);
      setShowUtm(false);
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not create the link"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Create smart link
          </DialogTitle>
          <DialogDescription>Shorten a URL, tag your campaign, and start tracking clicks instantly.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="create-link-form">
          <div className="space-y-1.5">
            <Label htmlFor="target_url">Destination URL *</Label>
            <Input id="target_url" placeholder="https://your-long-url.com/landing-page" value={form.target_url} onChange={set("target_url")} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Spring launch" value={form.title} onChange={set("title")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom_slug">Custom slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/</span>
                <Input id="custom_slug" placeholder="spring-launch" value={form.custom_slug} onChange={set("custom_slug")} />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expires_at">Expires at (optional)</Label>
            <Input id="expires_at" type="datetime-local" value={form.expires_at} onChange={set("expires_at")} />
          </div>

          <div className="rounded-lg border p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={showUtm} onChange={(e) => setShowUtm(e.target.checked)} data-testid="utm-toggle" />
              Tag this link with UTM campaign parameters
            </label>
            {showUtm ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-3" data-testid="utm-fields">
                <Input aria-label="UTM source" placeholder="utm_source (twitter)" value={form.utm_source} onChange={set("utm_source")} />
                <Input aria-label="UTM medium" placeholder="utm_medium (social)" value={form.utm_medium} onChange={set("utm_medium")} />
                <Input aria-label="UTM campaign" placeholder="utm_campaign (launch)" value={form.utm_campaign} onChange={set("utm_campaign")} />
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="animate-spin" /> Creating…
                </>
              ) : (
                "Create link"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}