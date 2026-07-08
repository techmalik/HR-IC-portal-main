import { useEffect, type ReactNode } from "react";
import { BackofficeSidebar } from "@/components/backoffice-sidebar";

interface BackofficeLayoutProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Override the highlighted sidebar nav item; defaults to the current route. */
  active?: string;
  /** Render custom content in the topbar instead of the default title. */
  topbarContent?: ReactNode;
}

export function BackofficeLayout({
  title,
  actions,
  children,
  active,
  topbarContent,
}: BackofficeLayoutProps) {
  useEffect(() => {
    let el = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "robots");
      document.head.appendChild(el);
    }
    el.setAttribute("content", "noindex, nofollow");
    return () => {
      el?.remove();
    };
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F3F4F6]">
      <BackofficeSidebar active={active} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-[52px] bg-white border-b border-[#E5E7EB] flex items-center px-6 shrink-0 gap-3">
          {topbarContent ?? (
            <span className="text-[13px] font-semibold text-[#374151] flex-1">{title}</span>
          )}
          {actions && <div className="flex items-center gap-[10px]">{actions}</div>}
        </div>
        <div className="flex-1 overflow-auto px-6 py-[22px] flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}
