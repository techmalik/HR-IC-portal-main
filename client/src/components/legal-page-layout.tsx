import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

interface LegalPageLayoutProps {
  title: string;
  updated: string;
  children: ReactNode;
}

export function LegalPageLayout({ title, updated, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-gray-500 text-[13px] no-underline hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Axle
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-14">
        <h1 className="font-serif font-normal text-gray-900 text-3xl mb-2">{title}</h1>
        <p className="text-gray-400 text-[13px] mb-10">Last updated {updated}</p>
        <div className="prose-legal text-gray-600 text-[15px] leading-relaxed [&>h2]:text-gray-900 [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mt-8 [&>h2]:mb-2 [&>p]:mb-4 [&_a]:text-gray-900 [&_a]:underline [&_h3]:text-gray-900 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:mb-4 [&_li]:pl-0.5">
          {children}
        </div>
      </main>
    </div>
  );
}
