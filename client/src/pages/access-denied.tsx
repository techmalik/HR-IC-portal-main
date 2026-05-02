import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { Link } from "wouter";

export default function AccessDenied() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <Lock className="h-8 w-8 text-amber-500" />
            <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            You don't have permission to view this page. This area is restricted to administrators only.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
