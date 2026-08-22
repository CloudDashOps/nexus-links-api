import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { getDomain } from "@/lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function shortUrl(code) {
  // Short links resolve on the API (the redirect router), not the static site
  return `${API_BASE_URL.replace(/\/$/, "")}/${code}`;
}

export default function LinksTable({ links, loading, onView, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!links.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <p className="font-medium">No links yet</p>
        <p className="text-sm text-muted-foreground">Create your first smart link to start tracking clicks.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border" data-testid="links-table">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Short link</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Destination</th>
            <th className="px-4 py-3 font-medium">Clicks</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="w-12 px-4 py-3" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr key={link.id} className="border-t transition-colors hover:bg-muted/30">
              <td className="max-w-[220px] px-4 py-3">
                <button
                  type="button"
                  onClick={() => onView(link)}
                  className="block truncate font-medium text-primary hover:underline"
                  title={shortUrl(link.short_code)}
                >
                  /{link.short_code}
                </button>
                {link.title ? (
                  <span className="block truncate text-xs text-muted-foreground">{link.title}</span>
                ) : null}
              </td>
              <td className="hidden max-w-[240px] px-4 py-3 md:table-cell">
                <span className="block truncate text-muted-foreground" title={link.target_url}>
                  {getDomain(link.target_url) || link.target_url}
                </span>
              </td>
              <td className="px-4 py-3 tabular-nums">{link.clicks}</td>
              <td className="px-4 py-3">
                <Badge variant={link.expires_at && new Date(link.expires_at) < new Date() ? "destructive" : "success"}>
                  {link.expires_at && new Date(link.expires_at) < new Date() ? "Expired" : "Active"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Actions for ${link.short_code}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(link)}>
                      <Pencil /> View analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(shortUrl(link.short_code))}>
                      Copy link
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(link)}>
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { shortUrl, API_BASE_URL };