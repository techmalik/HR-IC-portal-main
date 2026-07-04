import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F7F8FA]">
      <Card className="w-full max-w-md mx-4 border-[1.5px] border-neutral-200 rounded-xl">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-[#DC2626]" />
            <h1 className="font-serif text-2xl font-normal text-neutral-900">Page not found</h1>
          </div>

          <p className="mt-4 text-sm text-neutral-500">
            The page you're looking for doesn't exist.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
