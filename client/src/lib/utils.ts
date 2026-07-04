import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Shared tinted button styles for approve/reject-style review actions —
// used by team-invoices, team-timesheets, and overtime-approvals so the
// three review flows look identical instead of drifting independently.
export const APPROVE_BUTTON_CLASS =
  "bg-[#ECFDF5] dark:bg-[#059669]/15 text-[#059669] dark:text-[#34D399] border-[1.5px] border-[#A7F3D0] dark:border-[#059669]/30 hover:bg-[#D1FAE5] dark:hover:bg-[#059669]/25 font-semibold";
export const REJECT_BUTTON_CLASS =
  "bg-[#FEF2F2] dark:bg-[#DC2626]/15 text-[#DC2626] dark:text-[#F87171] border-[1.5px] border-[#FECACA] dark:border-[#DC2626]/30 hover:bg-[#FEE2E2] dark:hover:bg-[#DC2626]/25";
