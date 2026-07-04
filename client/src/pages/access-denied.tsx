import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { Link } from "wouter";

export default function AccessDenied() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F7F8FA]">
      <Card className="w-full max-w-md mx-4 border-[1.5px] border-neutral-200 rounded-xl">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <Lock className="h-8 w-8 text-[#D97706]" />
            <h1 className="font-serif text-2xl font-normal text-neutral-900">Access denied</h1>
          </div>
          <p className="mt-2 text-sm text-neutral-500">
            You don't have permission to view this page. This area is restricted to administrators only.
          </p>
          <Button asChild className="mt-6 bg-[#111827] hover:bg-neutral-800 text-white">
            <Link href="/">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
