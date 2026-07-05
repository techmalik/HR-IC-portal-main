import { BackofficeLayout } from "@/components/backoffice-layout";
import { MessageSquare } from "lucide-react";

export default function BackofficeTicketsPage() {
  return (
    <BackofficeLayout title="Tickets">
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
        <div className="w-12 h-12 bg-[#F3F4F6] rounded-xl flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-[#9CA3AF]" />
        </div>
        <div className="text-center">
          <div className="text-[15px] font-semibold text-[#111827] mb-1">Coming soon</div>
          <div className="text-[13px] text-[#9CA3AF] max-w-xs">
            A ticketing system is not yet available. Support requests are handled externally for now.
          </div>
        </div>
      </div>
    </BackofficeLayout>
  );
}
