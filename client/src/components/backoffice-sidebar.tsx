import { Link, useLocation } from "wouter";
import {
  LayoutGrid,
  Home,
  DollarSign,
  UserSearch,
  MessageSquare,
  Activity,
  Shield,
  BookOpen,
  Layers,
  Upload,
  Tag,
  ClipboardList,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const topItem: NavItem = { label: "Overview", href: "/back-office", icon: LayoutGrid };

const sections: NavSection[] = [
  {
    label: "Tenants",
    items: [
      { label: "All tenants", href: "/back-office/tenants", icon: Home },
      { label: "Discounts", href: "/back-office/discounts", icon: Tag },
      { label: "Billing", href: "/back-office/billing", icon: DollarSign },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Blog articles", href: "/back-office/blog", icon: BookOpen },
      { label: "SEO pages", href: "/back-office/seo", icon: Layers },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "User lookup", href: "/back-office/support", icon: UserSearch },
      { label: "Tickets", href: "/back-office/tickets", icon: MessageSquare },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Audit log", href: "/back-office/audit-log", icon: ClipboardList },
      { label: "System logs", href: "/back-office/logs", icon: Activity },
      { label: "Feature flags", href: "/back-office/flags", icon: Shield },
      { label: "File migration", href: "/back-office/migrate", icon: Upload },
    ],
  },
];

interface BackofficeSidebarProps {
  active?: string;
}

export function BackofficeSidebar({ active }: BackofficeSidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const currentPath = active ?? location;

  const handleSignOut = async () => {
    await logout();
    window.location.replace("/back-office/login");
  };

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "PA"
    : "PA";
  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : "Platform Admin";

  const isActive = (href: string) => {
    if (href === "/back-office") {
      return currentPath === "/back-office" || currentPath === "/back-office/";
    }
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  const renderItem = (item: NavItem) => {
    const activeItem = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link key={item.href} href={item.href}>
        <div
          className={`flex items-center justify-between gap-2 rounded-md px-[9px] py-[7px] mb-px cursor-pointer ${
            activeItem ? "bg-[rgba(5,150,105,0.12)]" : ""
          }`}
          data-testid={`link-backoffice-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Icon
              className="w-[14px] h-[14px] shrink-0"
              strokeWidth={2}
              color={activeItem ? "#34D399" : "#4B5563"}
            />
            <span
              className={`text-[13px] truncate ${
                activeItem ? "font-semibold text-[#34D399]" : "text-[#9CA3AF]"
              }`}
            >
              {item.label}
            </span>
          </div>
          {item.badge !== undefined && (
            <span className="bg-[#EF4444] text-white text-[9px] font-bold px-[6px] py-[1px] rounded-full shrink-0">
              {item.badge}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <aside className="w-[220px] bg-[#111827] flex flex-col shrink-0 h-full">
      {/* Logo + Internal badge */}
      <div className="px-[14px] py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-[9px] mb-2">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="11.5" stroke="white" strokeWidth="2" />
            <circle cx="14" cy="14" r="4" fill="white" />
          </svg>
          <span className="text-[#F9FAFB] text-[14px] font-bold tracking-[-0.02em]">Axle</span>
        </div>
        <div className="inline-flex items-center gap-[5px] bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.2)] rounded-[5px] px-2 py-[3px]">
          <div className="w-[5px] h-[5px] bg-[#EF4444] rounded-full shrink-0" />
          <span className="text-[9.5px] font-bold text-[#FCA5A5] tracking-[0.08em] uppercase">
            Internal
          </span>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 px-[6px] py-2 overflow-hidden">
        {renderItem(topItem)}
        {sections.map((section) => (
          <div key={section.label}>
            <div className="px-[9px] pt-[11px] pb-1 text-[9px] font-bold tracking-[0.12em] uppercase text-[#374151]">
              {section.label}
            </div>
            {section.items.map(renderItem)}
          </div>
        ))}
      </div>

      {/* Identity + Sign out */}
      <div className="px-[10px] py-[10px] border-t border-white/5">
        <div className="flex items-center gap-2 px-[9px] py-[7px]">
          <div className="w-7 h-7 bg-[#1C2230] border border-[#2A3545] rounded-full shrink-0 flex items-center justify-center">
            <span className="text-[#8DAFC8] text-[9.5px] font-bold">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[#E5E7EB] text-[12px] font-semibold truncate">{displayName}</div>
            <div className="text-[#4B5563] text-[10.5px]">Platform Admin</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-[9px] py-[7px] rounded-md text-[#6B7280] hover:text-[#9CA3AF] hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <LogOut className="w-[14px] h-[14px] shrink-0" strokeWidth={2} />
          <span className="text-[13px]">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
