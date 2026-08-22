import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <p className="text-7xl font-extrabold text-primary">404</p>
      <h1 className="text-xl font-semibold">This page went down a dead link</h1>
      <p className="text-muted-foreground">The page you're looking for doesn't exist or has moved.</p>
      <Button asChild variant="outline">
        <Link to="/">
          <ArrowLeft /> Back home
        </Link>
      </Button>
    </div>
  );
}