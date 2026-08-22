import { Component } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Catches render crashes so users see the cause instead of a blank page. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface it in the console too so support/debugging is possible
    console.error("UI crashed:", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                The page hit an unexpected error. The details below help us fix it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                {String(this.state.error?.message || this.state.error)}
              </pre>
              <Button onClick={() => window.location.assign("/dashboard")}>Back to dashboard</Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
