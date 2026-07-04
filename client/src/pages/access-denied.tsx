import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { Link } from "wouter";

export default function AccessDenied() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4 rounded-xl">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <Lock className="h-8 w-8 text-warning" />
            <h1 className="font-serif text-2xl font-normal text-foreground">Access denied</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            You don't have permission to view this page. This area is restricted to administrators only.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
