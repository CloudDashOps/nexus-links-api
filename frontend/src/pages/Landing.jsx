import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Download, Link2, Moon, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Zap,
    title: "Instant short links",
    description: "Cryptographically-random slugs, custom vanity URLs, and expiry control out of the box.",
  },
  {
    icon: BarChart3,
    title: "Link Intelligence",
    description: "Live click charts, device & browser breakdowns, and a weekday×hour heatmap of when your audience clicks.",
  },
  {
    icon: Sparkles,
    title: "Built-in UTM builder",
    description: "Tag campaigns as you create links — no spreadsheet gymnastics, no broken parameters.",
  },
  {
    icon: Download,
    title: "CSV export",
    description: "Take your raw click stream anywhere. One click, analysis-ready data.",
  },
];

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-accent/40">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Link2 className="h-4 w-4" />
          </span>
          NexusLinks
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/login">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 pb-24 pt-20 text-center">
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Now with Link Intelligence
        </span>
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
          Short links that tell you{" "}
          <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
            the whole story
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          NexusLinks isn't just a URL shortener. Every link becomes a live analytics dashboard — clicks,
          devices, referrers, and the exact hours your audience engages.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/register">
              Start for free <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/login">I already have an account</Link>
          </Button>
        </div>

        <div className="mt-20 grid w-full gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <f.icon className="mb-2 h-6 w-6 text-primary" />
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{f.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} NexusLinks — built with FastAPI, React, Tailwind CSS & shadcn/ui.
      </footer>
    </div>
  );
}