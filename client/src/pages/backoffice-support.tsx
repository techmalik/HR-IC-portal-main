import { BackofficeLayout } from "@/components/backoffice-layout";
import { UserSearch } from "lucide-react";

export default function BackofficeSupportPage() {
  return (
    <BackofficeLayout title="User Lookup">
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
        <div className="w-12 h-12 bg-[#F3F4F6] rounded-xl flex items-center justify-center">
          <UserSearch className="w-6 h-6 text-[#9CA3AF]" />
        </div>
        <div className="text-center">
          <div className="text-[15px] font-semibold text-[#111827] mb-1">Coming soon</div>
          <div className="text-[13px] text-[#9CA3AF] max-w-xs">
            Cross-tenant user lookup is not yet available. Use the tenant detail page to find users within a specific organization.
          </div>
        </div>
      </div>
    </BackofficeLayout>
  );
}
