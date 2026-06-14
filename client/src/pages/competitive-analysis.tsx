import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Layers, Download, ArrowLeft, Bell } from "lucide-react";

interface Competitor {
  name: string;
  oneLiner: string;
  pricingModel: string;
  pricingTiers: string[];
  fundingHeadcount: string;
  recentLaunches: string[];
  strengths: string[];
  weaknesses: string[];
  citations: { label: string; url: string }[];
  positioning: { x: number; y: number };
}

interface FeatureRow {
  feature: string;
  weight: number;
  scores: Record<string, number>;
}

interface KanoItem {
  feature: string;
  category: string;
  notes: string;
}

interface CompetitiveData {
  competitors: Competitor[];
  featureMatrix: FeatureRow[];
  kanoAnalysis: KanoItem[];
  positioningStatement: {
    forWhom: string;
    whoNeed: string;
    product: string;
    category: string;
    benefit: string;
    unlike: string;
    weAlone: string;
  };
  recommendations: Array<{
    title: string;
    body: string;
    battlecard: string[];
  }>;
  whiteSpace: string[];
}

const REPORT_TITLE = "Mentalyc Competitive Analysis";
const REPORT_SUBTITLE = "Contractor Management Market — May 2026";
const REPORT_AUTHOR = "Mentalyc Strategy";

function PageShell({
  pageNumber,
  totalPages,
  children,
}: {
  pageNumber: number;
  totalPages: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-white text-slate-900 shadow-xl border border-slate-200 mx-auto relative"
      style={{ width: 816, height: 1056 }}
      data-testid={`report-page-${pageNumber}`}
    >
      <div className="absolute inset-0 flex flex-col" style={{ padding: 48 }}>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-indigo-500" />
            {REPORT_TITLE}
          </div>
          <span>{REPORT_SUBTITLE}</span>
        </div>
        <div className="flex-1 pt-6 pb-4 overflow-hidden">{children}</div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200 pt-3">
          <span>© 2026 Mentalyc · Confidential strategy doc</span>
          <span>
            {pageNumber} / {totalPages}
          </span>
        </div>
      </div>
    </div>
  );
}

function CoverPage({ data }: { data: CompetitiveData }) {
  return (
    <div className="h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Mentalyc</span>
        </div>
        <div className="text-xs uppercase tracking-[0.25em] text-indigo-600 font-semibold mb-4">
          Strategy Report
        </div>
        <h1 className="text-5xl font-bold tracking-tight leading-tight mb-4">
          Competitive Analysis
        </h1>
        <h2 className="text-2xl text-slate-600 mb-12">
          Contractor management, EOR &amp; freelancer ops landscape
        </h2>
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Date</div>
            <div className="font-medium">May 2026</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Author</div>
            <div className="font-medium">{REPORT_AUTHOR}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Competitors</div>
            <div className="font-medium">{data.competitors.length} reviewed</div>
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl p-8">
        <div className="text-xs uppercase tracking-[0.2em] opacity-70 mb-2">Bottom line</div>
        <p className="text-xl leading-relaxed">
          The contractor management market is bifurcating: high-ASP EOR platforms (Deel, Remote,
          Multiplier) keep adding scope, while freelancer-side tools (Bonsai, Plane) stay shallow
          on buyer-side workflows. Mentalyc's wedge is the ops-only middle: approval-gated,
          audit-ready, live in a day, no EOR upsell.
        </p>
      </div>
    </div>
  );
}

function ExecutiveSummaryPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Executive summary</h1>
      <p className="text-sm text-slate-500 mb-6">Five takeaways before you read the rest.</p>
      <div className="space-y-4 text-sm leading-relaxed">
        {[
          {
            t: "1. The market is racing toward EOR, leaving contractor-ops underserved.",
            b: "Deel, Remote, Rippling, Multiplier, and Plane all upsell EOR (4–10x the per-seat fee). Buyers with no near-term EOR need are paying for optionality they never use.",
          },
          {
            t: "2. Implementation time is the most reliable wedge.",
            b: "Every competitor over $39/seat ships with a 2–6 week onboarding. Mentalyc's sub-day onboarding is structurally hard for them to match without cannibalizing their services revenue.",
          },
          {
            t: "3. Buyers want approval gates and audit trails, not more features.",
            b: "G2 weaknesses cluster around 'too much UI' (Deel, Rippling) or 'no real RBAC' (Bonsai, Plane). Mentalyc's invoice ↔ timesheet linkage and bounded supervisor view directly hit both pains.",
          },
          {
            t: "4. Pricing transparency is now table stakes.",
            b: "Remote and Plane publish flat pricing; Deel and Worksuite do not. Buyers self-select against opaque vendors. Mentalyc's free tier + published pricing already wins this comparison.",
          },
          {
            t: "5. White space: contractor performance reviews + branded portal at SMB price.",
            b: "Only Rippling bundles performance reviews — and only inside its $8/user platform. Mentalyc can own this in the 5-200 contractor band before anyone else moves.",
          },
        ].map((row) => (
          <div key={row.t} className="border-l-4 border-indigo-500 pl-4 py-1">
            <div className="font-semibold text-slate-900 mb-1">{row.t}</div>
            <div className="text-slate-600">{row.b}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MethodologyPage({ data }: { data: CompetitiveData }) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Methodology &amp; competitor set</h1>
      <p className="text-sm text-slate-500 mb-6">
        Seven competitors selected from G2 alternatives, Crunchbase category mapping, and inbound
        deal-loss analysis.
      </p>
      <h2 className="text-lg font-semibold mb-3">Sources reviewed per competitor</h2>
      <ul className="text-sm text-slate-700 space-y-1 mb-6 list-disc pl-5">
        <li>Public pricing pages (with Wayback Machine for messaging history)</li>
        <li>G2 + Capterra reviews (1–3 star for weaknesses, 5 star for strengths)</li>
        <li>Crunchbase for funding stage, headcount, and last raise</li>
        <li>LinkedIn Jobs to infer strategic direction (e.g. EOR expansion vs IT product)</li>
        <li>Recent product launches via changelog, blog, and press releases (last 12 months)</li>
      </ul>
      <h2 className="text-lg font-semibold mb-3">Final competitor set</h2>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {data.competitors.map((c) => (
          <div key={c.name} className="border border-slate-200 rounded-lg p-3">
            <div className="font-semibold text-slate-900">{c.name}</div>
            <div className="text-xs text-slate-500 leading-snug mt-1">{c.oneLiner}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-6">
        Excluded but tracked passively: Papaya Global, Oyster, Velocity Global, Letsdeel
        SMB-tier, Upwork Enterprise. None met the contractor-ops-first ICP overlap threshold.
      </p>
    </div>
  );
}

function CompetitorPage({ index, data }: { index: number; data: CompetitiveData }) {
  const c = data.competitors[index];
  return (
    <div className="text-sm">
      <div className="text-[10px] uppercase tracking-widest text-indigo-600 font-semibold mb-1">
        Dossier {index + 1} of {data.competitors.length}
      </div>
      <h1 className="text-3xl font-bold mb-2">{c.name}</h1>
      <p className="text-slate-600 mb-5 leading-relaxed">{c.oneLiner}</p>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Pricing model</div>
          <div className="text-sm text-slate-700 mb-2">{c.pricingModel}</div>
          <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
            {c.pricingTiers.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Funding &amp; team</div>
          <div className="text-sm text-slate-700 mb-3">{c.fundingHeadcount}</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Recent launches (12mo)</div>
          <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
            {c.recentLaunches.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-emerald-700 font-semibold mb-2">
            Strengths
          </div>
          <ul className="text-xs text-slate-700 space-y-2">
            {c.strengths.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-emerald-600">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-red-700 font-semibold mb-2">
            Weaknesses
          </div>
          <ul className="text-xs text-slate-700 space-y-2">
            {c.weaknesses.map((w) => (
              <li key={w} className="flex gap-2">
                <span className="text-red-600">−</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3">
        <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Citations</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-indigo-600">
          {c.citations.map((cit) => (
            <span key={cit.url}>
              {cit.label} — <span className="text-slate-500">{cit.url}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MatrixPage({
  data,
  competitorNames,
}: {
  data: CompetitiveData;
  competitorNames: string[];
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Feature comparison matrix</h1>
      <p className="text-sm text-slate-500 mb-5">
        Scores 0–5. Weight reflects buyer importance (from lost-deal interviews + G2 review
        clustering). Weighted total below.
      </p>
      <div className="overflow-hidden border border-slate-200 rounded-lg">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-2 py-2 font-semibold">Feature</th>
              <th className="text-center px-1 py-2 font-semibold">W</th>
              {competitorNames.map((n) => (
                <th
                  key={n}
                  className={`text-center px-1 py-2 font-semibold ${
                    n === "Mentalyc" ? "bg-indigo-50 text-indigo-700" : ""
                  }`}
                >
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.featureMatrix.map((row, i) => (
              <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                <td className="px-2 py-1.5 text-slate-700">{row.feature}</td>
                <td className="text-center px-1 py-1.5 text-slate-500">{row.weight}</td>
                {competitorNames.map((n) => {
                  const score = row.scores[n] ?? 0;
                  const intensity = score / 5;
                  return (
                    <td
                      key={n}
                      className={`text-center px-1 py-1.5 font-medium ${
                        n === "Mentalyc" ? "bg-indigo-50/60" : ""
                      }`}
                      style={{
                        background:
                          score > 0
                            ? n === "Mentalyc"
                              ? `rgba(99, 102, 241, ${0.1 + intensity * 0.35})`
                              : `rgba(16, 185, 129, ${intensity * 0.25})`
                            : "transparent",
                      }}
                    >
                      {score}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-slate-100 font-semibold">
              <td className="px-2 py-2">Weighted total</td>
              <td className="text-center px-1 py-2">—</td>
              {competitorNames.map((n) => {
                const total = data.featureMatrix.reduce(
                  (sum, r) => sum + (r.scores[n] ?? 0) * r.weight,
                  0
                );
                return (
                  <td
                    key={n}
                    className={`text-center px-1 py-2 ${n === "Mentalyc" ? "text-indigo-700" : ""}`}
                  >
                    {total}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 mt-4">
        Mentalyc leads on setup speed, OOO, timesheet capture, and SMB pricing. Deel/Remote lead
        on EOR + country breadth. Rippling wins reporting + RBAC by virtue of its platform.
      </p>
    </div>
  );
}

function PositioningMapPage({ data }: { data: CompetitiveData }) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">2×2 positioning map</h1>
      <p className="text-sm text-slate-500 mb-5">
        X axis: contractor-only focus → full HR/EOR scope. Y axis: SMB self-serve → enterprise
        implementation.
      </p>
      <div className="relative bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl mx-auto" style={{ width: 620, height: 480 }}>
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <div className="border-r border-b border-slate-200/80 p-3 text-[10px] uppercase tracking-widest text-slate-400">
            Contractor-only · Enterprise
          </div>
          <div className="border-b border-slate-200/80 p-3 text-[10px] uppercase tracking-widest text-slate-400 text-right">
            Full scope · Enterprise
          </div>
          <div className="border-r border-slate-200/80 p-3 text-[10px] uppercase tracking-widest text-slate-400 self-end">
            Contractor-only · SMB
          </div>
          <div className="p-3 text-[10px] uppercase tracking-widest text-slate-400 text-right self-end">
            Full scope · SMB
          </div>
        </div>
        {/* Mentalyc */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ left: `${0.18 * 620}px`, top: `${(1 - 0.4) * 480}px` }}
        >
          <div className="w-4 h-4 rounded-full bg-indigo-600 ring-4 ring-indigo-200" />
          <div className="text-xs font-bold text-indigo-700 mt-1 whitespace-nowrap">Mentalyc</div>
        </div>
        {data.competitors.map((c) => (
          <div
            key={c.name}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${c.positioning.x * 620}px`, top: `${(1 - c.positioning.y) * 480}px` }}
          >
            <div className="w-3 h-3 rounded-full bg-slate-700" />
            <div className="text-[11px] text-slate-700 mt-1 whitespace-nowrap">{c.name}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-4 max-w-2xl">
        Mentalyc owns the lower-left quadrant alone — contractor-only, SMB self-serve. Bonsai
        sits closest but on the freelancer side. Plane is the most likely encroacher; their
        product velocity is the key signal to monitor.
      </p>
    </div>
  );
}

function KanoWhiteSpacePage({ data }: { data: CompetitiveData }) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">White space &amp; Kano analysis</h1>
      <p className="text-sm text-slate-500 mb-5">
        Where buyer demand is unmet today, and which features generate satisfaction vs. expectation.
      </p>
      <h2 className="text-base font-semibold mb-2">White space (unmet demand)</h2>
      <ul className="text-sm text-slate-700 space-y-2 mb-6 list-disc pl-5">
        {data.whiteSpace.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      <h2 className="text-base font-semibold mb-2">Kano categorization</h2>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold">Category</th>
              <th className="text-left px-3 py-2 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.kanoAnalysis.map((row, i) => (
              <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                <td className="px-3 py-2 font-medium text-slate-800">{row.feature}</td>
                <td className="px-3 py-2 text-indigo-700">{row.category}</td>
                <td className="px-3 py-2 text-slate-600">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PositioningPage({ data }: { data: CompetitiveData }) {
  const ps = data.positioningStatement;
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Positioning statement (April Dunford)</h1>
      <p className="text-sm text-slate-500 mb-6">
        Five-input positioning. Use this as the source of truth for landing-page hero, sales deck
        slide 1, and investor narrative.
      </p>
      <div className="space-y-4 text-sm">
        {[
          { k: "For", v: ps.forWhom },
          { k: "Who need", v: ps.whoNeed },
          { k: "Mentalyc is", v: ps.product + " " + ps.category },
          { k: "That delivers", v: ps.benefit },
          { k: "Unlike", v: ps.unlike },
          { k: "We alone", v: ps.weAlone },
        ].map((row) => (
          <div key={row.k} className="grid grid-cols-[110px_1fr] gap-4 items-start">
            <div className="text-[10px] uppercase tracking-widest text-indigo-600 font-semibold pt-1">
              {row.k}
            </div>
            <div className="text-slate-800 leading-relaxed">{row.v}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 p-5 bg-indigo-50 border border-indigo-200 rounded-xl">
        <div className="text-[10px] uppercase tracking-widest text-indigo-700 font-semibold mb-2">
          One-line version (use everywhere)
        </div>
        <div className="text-base font-semibold text-slate-900 leading-snug">
          Mentalyc is the contractor operations platform for SaaS teams that want timesheets,
          invoices, and approvals in a day — without paying for an EOR they don't need.
        </div>
      </div>
    </div>
  );
}

function RecommendationsPage({ data }: { data: CompetitiveData }) {
  return (
    <div className="text-sm">
      <h1 className="text-3xl font-bold mb-2">Strategic recommendations</h1>
      <p className="text-sm text-slate-500 mb-5">
        Three actions, ordered by leverage. Each ships with battlecard trap-setting questions for
        sales.
      </p>
      <div className="space-y-5">
        {data.recommendations.map((r, i) => (
          <div key={r.title} className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-2">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <div className="font-semibold text-base text-slate-900">{r.title}</div>
            </div>
            <p className="text-slate-700 leading-relaxed mb-3 pl-10">{r.body}</p>
            <div className="pl-10">
              <div className="text-[10px] uppercase tracking-widest text-amber-700 font-semibold mb-1">
                Battlecard — trap-setting questions
              </div>
              <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4">
                {r.battlecard.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonitoringPage() {
  return (
    <div className="text-sm">
      <h1 className="text-3xl font-bold mb-2">Monitoring plan</h1>
      <p className="text-sm text-slate-500 mb-5">
        Cheap, repeatable monthly ritual. The bookmark bundle lives in <code>competitor-monitoring.md</code>{" "}
        at the project root.
      </p>

      <h2 className="text-base font-semibold mb-2">Monthly ritual (30 minutes)</h2>
      <ol className="list-decimal pl-5 space-y-1 text-slate-700 mb-5">
        <li>Open the bookmark folder; check pricing &amp; changelog page for each competitor (5 min × 7 = 35 min hard cap, 30 min realistic).</li>
        <li>Skim Crunchbase for funding/headcount deltas.</li>
        <li>Skim LinkedIn jobs for new role types (signals strategy shifts).</li>
        <li>Log meaningful changes in a single Linear issue tagged <code>compete</code>.</li>
        <li>If a change is material (pricing cut, new EOR-adjacent SKU, leadership hire), trigger an out-of-cycle review.</li>
      </ol>

      <h2 className="text-base font-semibold mb-2">Activation package — pick one channel</h2>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          {
            t: "Slack RSS",
            b: "Use the /feed slash command to add the seven competitor blog/changelog RSS feeds into a #compete channel.",
          },
          {
            t: "Teams RSS",
            b: "Use the RSS connector on a 'Compete' channel; paste the same feed list. Same outcome, MS-flavoured.",
          },
          {
            t: "Google Alerts",
            b: "Create an alert per competitor name + 'pricing' / 'launches' / 'funding'; deliver weekly digest to ops@.",
          },
        ].map((c) => (
          <div key={c.t} className="border border-slate-200 rounded-lg p-3">
            <div className="font-semibold mb-1">{c.t}</div>
            <div className="text-xs text-slate-600 leading-snug">{c.b}</div>
          </div>
        ))}
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <Bell className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <strong>Owner action:</strong> tell the Mentalyc team which channel to activate. The
          feed bundle is ready to paste — see <code>competitor-monitoring.md</code> at the
          project root.
        </div>
      </div>
    </div>
  );
}

// ============ PDF generation ============

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;

interface PdfCursor {
  doc: jsPDF;
  pageNum: number;
  totalPages: number;
  y: number;
}

function drawHeaderFooter(c: PdfCursor) {
  const { doc, pageNum, totalPages } = c;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(REPORT_TITLE.toUpperCase(), MARGIN, 24);
  doc.text(REPORT_SUBTITLE, PAGE_W - MARGIN, 24, { align: "right" });
  doc.setDrawColor(220);
  doc.line(MARGIN, 30, PAGE_W - MARGIN, 30);
  doc.line(MARGIN, PAGE_H - 30, PAGE_W - MARGIN, PAGE_H - 30);
  doc.text("© 2026 Mentalyc · Confidential", MARGIN, PAGE_H - 18);
  doc.text(`${pageNum} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 18, { align: "right" });
  doc.setTextColor(0);
}

function newPage(c: PdfCursor) {
  c.doc.addPage();
  c.pageNum += 1;
  drawHeaderFooter(c);
  c.y = 50;
}

function ensureSpace(c: PdfCursor, needed: number) {
  if (c.y + needed > PAGE_H - 50) newPage(c);
}

function writeHeading(c: PdfCursor, text: string, size = 22) {
  ensureSpace(c, size + 12);
  c.doc.setFont("helvetica", "bold");
  c.doc.setFontSize(size);
  c.doc.setTextColor(20);
  c.doc.text(text, MARGIN, c.y + size);
  c.y += size + 8;
}

function writeSubheading(c: PdfCursor, text: string) {
  ensureSpace(c, 18);
  c.doc.setFont("helvetica", "bold");
  c.doc.setFontSize(12);
  c.doc.setTextColor(60);
  c.doc.text(text, MARGIN, c.y + 12);
  c.y += 18;
}

function writeText(c: PdfCursor, text: string, opts: { size?: number; color?: number; indent?: number } = {}) {
  const size = opts.size ?? 10;
  const color = opts.color ?? 60;
  const indent = opts.indent ?? 0;
  c.doc.setFont("helvetica", "normal");
  c.doc.setFontSize(size);
  c.doc.setTextColor(color);
  const lines = c.doc.splitTextToSize(text, CONTENT_W - indent) as string[];
  for (const line of lines) {
    ensureSpace(c, size + 3);
    c.doc.text(line, MARGIN + indent, c.y + size);
    c.y += size + 3;
  }
}

function writeBullet(c: PdfCursor, text: string, marker = "•") {
  c.doc.setFont("helvetica", "normal");
  c.doc.setFontSize(10);
  c.doc.setTextColor(60);
  const lines = c.doc.splitTextToSize(text, CONTENT_W - 16) as string[];
  ensureSpace(c, 13);
  c.doc.text(marker, MARGIN, c.y + 10);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ensureSpace(c, 13);
    c.doc.text(lines[i], MARGIN + 12, c.y + 10);
    c.y += 13;
  }
  c.y += 2;
}

function spacer(c: PdfCursor, h: number) {
  c.y += h;
}

function generatePdf(data: CompetitiveData, competitorNames: string[]) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const c: PdfCursor = { doc, pageNum: 1, totalPages: 0, y: 50 };

  // We do two passes: first a draft to count pages, then final with totals.
  // jsPDF doesn't let us rewrite footers post-hoc easily, so we'll instead
  // render once, count, then re-render with the count.
  function renderAll(cursor: PdfCursor) {
    drawHeaderFooter(cursor);

    // Cover
    cursor.doc.setFont("helvetica", "bold");
    cursor.doc.setFontSize(10);
    cursor.doc.setTextColor(99, 102, 241);
    cursor.doc.text("STRATEGY REPORT", MARGIN, 80);
    cursor.doc.setFontSize(36);
    cursor.doc.setTextColor(20);
    cursor.doc.text("Competitive Analysis", MARGIN, 130);
    cursor.doc.setFont("helvetica", "normal");
    cursor.doc.setFontSize(16);
    cursor.doc.setTextColor(80);
    cursor.doc.text("Contractor management, EOR & freelancer ops landscape", MARGIN, 158);
    cursor.doc.setFontSize(10);
    cursor.doc.setTextColor(120);
    cursor.doc.text("May 2026  ·  Mentalyc Strategy  ·  7 competitors reviewed", MARGIN, 184);

    cursor.doc.setFillColor(99, 102, 241);
    cursor.doc.roundedRect(MARGIN, 240, CONTENT_W, 220, 12, 12, "F");
    cursor.doc.setTextColor(255);
    cursor.doc.setFont("helvetica", "bold");
    cursor.doc.setFontSize(11);
    cursor.doc.text("BOTTOM LINE", MARGIN + 20, 270);
    cursor.doc.setFont("helvetica", "normal");
    cursor.doc.setFontSize(13);
    const blLines = cursor.doc.splitTextToSize(
      "The contractor management market is bifurcating: high-ASP EOR platforms (Deel, Remote, Multiplier) keep adding scope, while freelancer-side tools (Bonsai, Plane) stay shallow on buyer-side workflows. Mentalyc's wedge is the ops-only middle: approval-gated, audit-ready, live in a day, no EOR upsell.",
      CONTENT_W - 40
    ) as string[];
    let by = 295;
    for (const l of blLines) {
      cursor.doc.text(l, MARGIN + 20, by);
      by += 18;
    }
    cursor.doc.setTextColor(20);

    // Executive summary
    newPage(cursor);
    writeHeading(cursor, "Executive summary");
    writeText(cursor, "Five takeaways before you read the rest.", { color: 130 });
    spacer(cursor, 6);
    const exec = [
      ["1. The market is racing toward EOR, leaving contractor-ops underserved.", "Deel, Remote, Rippling, Multiplier, and Plane all upsell EOR (4–10x the per-seat fee). Buyers with no near-term EOR need are paying for optionality they never use."],
      ["2. Implementation time is the most reliable wedge.", "Every competitor over $39/seat ships with a 2–6 week onboarding. Mentalyc's sub-day onboarding is structurally hard for them to match without cannibalizing their services revenue."],
      ["3. Buyers want approval gates and audit trails, not more features.", "G2 weaknesses cluster around 'too much UI' (Deel, Rippling) or 'no real RBAC' (Bonsai, Plane). Mentalyc's invoice ↔ timesheet linkage and bounded supervisor view directly hit both pains."],
      ["4. Pricing transparency is now table stakes.", "Remote and Plane publish flat pricing; Deel and Worksuite do not. Buyers self-select against opaque vendors. Mentalyc's free tier + published pricing already wins this comparison."],
      ["5. White space: contractor performance reviews + branded portal at SMB price.", "Only Rippling bundles performance reviews — and only inside its $8/user platform. Mentalyc can own this in the 5-200 contractor band before anyone else moves."],
    ];
    for (const [h, b] of exec) {
      ensureSpace(cursor, 60);
      cursor.doc.setFillColor(99, 102, 241);
      cursor.doc.rect(MARGIN, cursor.y + 4, 3, 36, "F");
      cursor.doc.setFont("helvetica", "bold");
      cursor.doc.setFontSize(11);
      cursor.doc.setTextColor(20);
      const hLines = cursor.doc.splitTextToSize(h, CONTENT_W - 16) as string[];
      let lineY = cursor.y + 14;
      for (const l of hLines) {
        cursor.doc.text(l, MARGIN + 12, lineY);
        lineY += 13;
      }
      cursor.doc.setFont("helvetica", "normal");
      cursor.doc.setFontSize(10);
      cursor.doc.setTextColor(80);
      const bLines = cursor.doc.splitTextToSize(b, CONTENT_W - 16) as string[];
      for (const l of bLines) {
        cursor.doc.text(l, MARGIN + 12, lineY);
        lineY += 12;
      }
      cursor.y = lineY + 8;
    }

    // Methodology
    newPage(cursor);
    writeHeading(cursor, "Methodology & competitor set");
    writeText(cursor, "Seven competitors selected from G2 alternatives, Crunchbase category mapping, and inbound deal-loss analysis.", { color: 130 });
    spacer(cursor, 6);
    writeSubheading(cursor, "Sources reviewed per competitor");
    [
      "Public pricing pages (with Wayback Machine for messaging history)",
      "G2 + Capterra reviews (1–3 star for weaknesses, 5 star for strengths)",
      "Crunchbase for funding stage, headcount, and last raise",
      "LinkedIn Jobs to infer strategic direction",
      "Recent product launches via changelog, blog, and press releases (last 12 months)",
    ].forEach((b) => writeBullet(cursor, b));
    spacer(cursor, 6);
    writeSubheading(cursor, "Final competitor set");
    data.competitors.forEach((c2) => {
      writeBullet(cursor, `${c2.name} — ${c2.oneLiner}`);
    });
    spacer(cursor, 6);
    writeText(cursor, "Excluded but tracked passively: Papaya Global, Oyster, Velocity Global, Letsdeel SMB-tier, Upwork Enterprise.", { size: 9, color: 130 });

    // Competitor dossiers
    data.competitors.forEach((c2, idx) => {
      newPage(cursor);
      cursor.doc.setFont("helvetica", "bold");
      cursor.doc.setFontSize(9);
      cursor.doc.setTextColor(99, 102, 241);
      cursor.doc.text(`DOSSIER ${idx + 1} OF ${data.competitors.length}`, MARGIN, cursor.y + 10);
      cursor.y += 14;
      writeHeading(cursor, c2.name, 24);
      writeText(cursor, c2.oneLiner, { color: 80 });
      spacer(cursor, 8);
      writeSubheading(cursor, "Pricing");
      writeText(cursor, c2.pricingModel);
      c2.pricingTiers.forEach((t) => writeBullet(cursor, t));
      spacer(cursor, 4);
      writeSubheading(cursor, "Funding & team");
      writeText(cursor, c2.fundingHeadcount);
      spacer(cursor, 4);
      writeSubheading(cursor, "Recent launches (last 12 months)");
      c2.recentLaunches.forEach((t) => writeBullet(cursor, t));
      spacer(cursor, 4);
      writeSubheading(cursor, "Strengths");
      c2.strengths.forEach((t) => writeBullet(cursor, t, "+"));
      spacer(cursor, 4);
      writeSubheading(cursor, "Weaknesses");
      c2.weaknesses.forEach((t) => writeBullet(cursor, t, "−"));
      spacer(cursor, 4);
      writeSubheading(cursor, "Citations");
      c2.citations.forEach((cit) => writeBullet(cursor, `${cit.label} — ${cit.url}`));
    });

    // Matrix
    newPage(cursor);
    writeHeading(cursor, "Feature comparison matrix");
    writeText(cursor, "Scores 0–5. Weight = buyer importance (from lost-deal interviews + G2 review clustering). Mentalyc highlighted.", { color: 130 });
    spacer(cursor, 8);

    const matrixCols = ["Feature", "W", ...competitorNames];
    const colWidths = [180, 18, ...competitorNames.map(() => (CONTENT_W - 200) / competitorNames.length)];
    const startX = MARGIN;
    cursor.doc.setFont("helvetica", "bold");
    cursor.doc.setFontSize(8);
    cursor.doc.setFillColor(243, 244, 246);
    cursor.doc.rect(startX, cursor.y, CONTENT_W, 16, "F");
    cursor.doc.setTextColor(40);
    let cx = startX;
    matrixCols.forEach((label, i) => {
      cursor.doc.text(label, cx + (i === 0 ? 4 : colWidths[i] / 2), cursor.y + 11, {
        align: i === 0 ? "left" : "center",
      });
      cx += colWidths[i];
    });
    cursor.y += 16;

    cursor.doc.setFont("helvetica", "normal");
    cursor.doc.setFontSize(8);
    data.featureMatrix.forEach((row, ridx) => {
      ensureSpace(cursor, 14);
      if (ridx % 2 === 1) {
        cursor.doc.setFillColor(249, 250, 251);
        cursor.doc.rect(startX, cursor.y, CONTENT_W, 14, "F");
      }
      cx = startX;
      cursor.doc.setTextColor(40);
      cursor.doc.text(row.feature, cx + 4, cursor.y + 10);
      cx += colWidths[0];
      cursor.doc.setTextColor(120);
      cursor.doc.text(String(row.weight), cx + colWidths[1] / 2, cursor.y + 10, { align: "center" });
      cx += colWidths[1];
      competitorNames.forEach((n, ni) => {
        const score = row.scores[n] ?? 0;
        if (score > 0) {
          if (n === "Mentalyc") {
            cursor.doc.setFillColor(224, 231, 255);
          } else {
            const a = (score / 5) * 0.4;
            cursor.doc.setFillColor(220 - 180 * a, 252 - 80 * a, 231 - 60 * a);
          }
          cursor.doc.rect(cx + 1, cursor.y + 1, colWidths[2 + ni] - 2, 12, "F");
        }
        cursor.doc.setTextColor(n === "Mentalyc" ? 67 : 40, n === "Mentalyc" ? 56 : 40, n === "Mentalyc" ? 202 : 40);
        cursor.doc.text(String(score), cx + colWidths[2 + ni] / 2, cursor.y + 10, { align: "center" });
        cx += colWidths[2 + ni];
      });
      cursor.y += 14;
    });

    // Weighted total row
    ensureSpace(cursor, 16);
    cursor.doc.setFillColor(229, 231, 235);
    cursor.doc.rect(startX, cursor.y, CONTENT_W, 16, "F");
    cursor.doc.setFont("helvetica", "bold");
    cx = startX;
    cursor.doc.setTextColor(20);
    cursor.doc.text("Weighted total", cx + 4, cursor.y + 11);
    cx += colWidths[0];
    cursor.doc.setTextColor(120);
    cursor.doc.text("—", cx + colWidths[1] / 2, cursor.y + 11, { align: "center" });
    cx += colWidths[1];
    competitorNames.forEach((n, ni) => {
      const total = data.featureMatrix.reduce((s, r) => s + (r.scores[n] ?? 0) * r.weight, 0);
      cursor.doc.setTextColor(n === "Mentalyc" ? 67 : 40, n === "Mentalyc" ? 56 : 40, n === "Mentalyc" ? 202 : 40);
      cursor.doc.text(String(total), cx + colWidths[2 + ni] / 2, cursor.y + 11, { align: "center" });
      cx += colWidths[2 + ni];
    });
    cursor.y += 18;

    cursor.doc.setFont("helvetica", "normal");
    cursor.doc.setFontSize(9);
    cursor.doc.setTextColor(120);
    writeText(cursor, "Mentalyc leads on setup speed, OOO, timesheet capture, and SMB pricing. Deel/Remote lead on EOR + country breadth. Rippling wins reporting + RBAC by virtue of its platform.", { size: 9, color: 120 });

    // Positioning map
    newPage(cursor);
    writeHeading(cursor, "2×2 positioning map");
    writeText(cursor, "X axis: contractor-only focus → full HR/EOR scope. Y axis: SMB self-serve → enterprise implementation.", { color: 130 });
    spacer(cursor, 8);
    const mapX = MARGIN + 20;
    const mapY = cursor.y;
    const mapW = CONTENT_W - 40;
    const mapH = 360;
    cursor.doc.setDrawColor(200);
    cursor.doc.setFillColor(249, 250, 251);
    cursor.doc.roundedRect(mapX, mapY, mapW, mapH, 8, 8, "FD");
    cursor.doc.setDrawColor(220);
    cursor.doc.line(mapX + mapW / 2, mapY, mapX + mapW / 2, mapY + mapH);
    cursor.doc.line(mapX, mapY + mapH / 2, mapX + mapW, mapY + mapH / 2);
    cursor.doc.setFontSize(7);
    cursor.doc.setTextColor(150);
    cursor.doc.text("CONTRACTOR-ONLY · ENTERPRISE", mapX + 6, mapY + 12);
    cursor.doc.text("FULL SCOPE · ENTERPRISE", mapX + mapW - 6, mapY + 12, { align: "right" });
    cursor.doc.text("CONTRACTOR-ONLY · SMB", mapX + 6, mapY + mapH - 6);
    cursor.doc.text("FULL SCOPE · SMB", mapX + mapW - 6, mapY + mapH - 6, { align: "right" });

    function plot(x: number, y: number, label: string, isUs: boolean) {
      const px = mapX + x * mapW;
      const py = mapY + (1 - y) * mapH;
      if (isUs) {
        cursor.doc.setFillColor(99, 102, 241);
        cursor.doc.circle(px, py, 5, "F");
        cursor.doc.setFillColor(199, 210, 254);
        cursor.doc.circle(px, py, 9, "S");
        cursor.doc.setTextColor(67, 56, 202);
        cursor.doc.setFont("helvetica", "bold");
      } else {
        cursor.doc.setFillColor(60, 60, 60);
        cursor.doc.circle(px, py, 3, "F");
        cursor.doc.setTextColor(60);
        cursor.doc.setFont("helvetica", "normal");
      }
      cursor.doc.setFontSize(8);
      cursor.doc.text(label, px + 7, py + 3);
    }
    plot(0.18, 0.4, "Mentalyc", true);
    data.competitors.forEach((cc) => plot(cc.positioning.x, cc.positioning.y, cc.name, false));
    cursor.y = mapY + mapH + 14;
    writeText(cursor, "Mentalyc owns the lower-left quadrant alone — contractor-only, SMB self-serve. Bonsai sits closest but on the freelancer side. Plane is the most likely encroacher; their product velocity is the key signal to monitor.", { size: 9, color: 120 });

    // Kano + white space
    newPage(cursor);
    writeHeading(cursor, "White space & Kano analysis");
    writeText(cursor, "Where buyer demand is unmet today, and which features generate satisfaction vs. expectation.", { color: 130 });
    spacer(cursor, 6);
    writeSubheading(cursor, "White space (unmet demand)");
    data.whiteSpace.forEach((w) => writeBullet(cursor, w));
    spacer(cursor, 6);
    writeSubheading(cursor, "Kano categorization");
    data.kanoAnalysis.forEach((row) => {
      ensureSpace(cursor, 30);
      cursor.doc.setFont("helvetica", "bold");
      cursor.doc.setFontSize(10);
      cursor.doc.setTextColor(40);
      cursor.doc.text(row.feature, MARGIN, cursor.y + 10);
      cursor.doc.setFont("helvetica", "normal");
      cursor.doc.setFontSize(9);
      cursor.doc.setTextColor(99, 102, 241);
      cursor.doc.text(row.category, MARGIN, cursor.y + 22);
      cursor.doc.setTextColor(80);
      const lines = cursor.doc.splitTextToSize(row.notes, CONTENT_W) as string[];
      let ly = cursor.y + 34;
      for (const l of lines) {
        ensureSpace(cursor, 11);
        cursor.doc.text(l, MARGIN, ly);
        ly += 11;
      }
      cursor.y = ly + 4;
    });

    // Positioning (Dunford)
    newPage(cursor);
    writeHeading(cursor, "Positioning (April Dunford)");
    writeText(cursor, "Five-input positioning. Source of truth for landing-page hero, sales deck slide 1, investor narrative.", { color: 130 });
    spacer(cursor, 8);
    const ps = data.positioningStatement;
    const psRows = [
      ["For", ps.forWhom],
      ["Who need", ps.whoNeed],
      ["Mentalyc is", ps.product + " " + ps.category],
      ["That delivers", ps.benefit],
      ["Unlike", ps.unlike],
      ["We alone", ps.weAlone],
    ];
    psRows.forEach(([k, v]) => {
      ensureSpace(cursor, 30);
      cursor.doc.setFont("helvetica", "bold");
      cursor.doc.setFontSize(8);
      cursor.doc.setTextColor(99, 102, 241);
      cursor.doc.text(k.toUpperCase(), MARGIN, cursor.y + 10);
      cursor.doc.setFont("helvetica", "normal");
      cursor.doc.setFontSize(10);
      cursor.doc.setTextColor(40);
      const lines = cursor.doc.splitTextToSize(v, CONTENT_W - 90) as string[];
      let ly = cursor.y + 10;
      for (const l of lines) {
        ensureSpace(cursor, 13);
        cursor.doc.text(l, MARGIN + 90, ly);
        ly += 13;
      }
      cursor.y = ly + 6;
    });
    spacer(cursor, 4);
    ensureSpace(cursor, 70);
    cursor.doc.setFillColor(238, 242, 255);
    cursor.doc.setDrawColor(199, 210, 254);
    cursor.doc.roundedRect(MARGIN, cursor.y, CONTENT_W, 70, 8, 8, "FD");
    cursor.doc.setFont("helvetica", "bold");
    cursor.doc.setFontSize(8);
    cursor.doc.setTextColor(67, 56, 202);
    cursor.doc.text("ONE-LINE VERSION (USE EVERYWHERE)", MARGIN + 14, cursor.y + 18);
    cursor.doc.setFontSize(11);
    cursor.doc.setTextColor(20);
    const ol = cursor.doc.splitTextToSize(
      "Mentalyc is the contractor operations platform for SaaS teams that want timesheets, invoices, and approvals in a day — without paying for an EOR they don't need.",
      CONTENT_W - 28
    ) as string[];
    let oly = cursor.y + 36;
    ol.forEach((l) => {
      cursor.doc.text(l, MARGIN + 14, oly);
      oly += 14;
    });
    cursor.y += 76;

    // Recommendations
    newPage(cursor);
    writeHeading(cursor, "Strategic recommendations");
    writeText(cursor, "Three actions, ordered by leverage. Each ships with battlecard trap-setting questions for sales.", { color: 130 });
    spacer(cursor, 6);
    data.recommendations.forEach((r, i) => {
      ensureSpace(cursor, 80);
      cursor.doc.setFillColor(99, 102, 241);
      cursor.doc.circle(MARGIN + 10, cursor.y + 10, 10, "F");
      cursor.doc.setFont("helvetica", "bold");
      cursor.doc.setFontSize(11);
      cursor.doc.setTextColor(255);
      cursor.doc.text(String(i + 1), MARGIN + 10, cursor.y + 14, { align: "center" });
      cursor.doc.setTextColor(20);
      cursor.doc.setFontSize(13);
      const titleLines = cursor.doc.splitTextToSize(r.title, CONTENT_W - 30) as string[];
      let ly = cursor.y + 14;
      titleLines.forEach((l) => {
        cursor.doc.text(l, MARGIN + 28, ly);
        ly += 15;
      });
      cursor.y = ly + 4;
      writeText(cursor, r.body, { indent: 28 });
      cursor.doc.setFont("helvetica", "bold");
      cursor.doc.setFontSize(8);
      cursor.doc.setTextColor(180, 83, 9);
      ensureSpace(cursor, 14);
      cursor.doc.text("BATTLECARD — TRAP-SETTING QUESTIONS", MARGIN + 28, cursor.y + 10);
      cursor.y += 14;
      r.battlecard.forEach((q) => {
        cursor.doc.setFont("helvetica", "normal");
        cursor.doc.setFontSize(9);
        cursor.doc.setTextColor(60);
        const lines = cursor.doc.splitTextToSize(q, CONTENT_W - 44) as string[];
        ensureSpace(cursor, 12);
        cursor.doc.text("•", MARGIN + 28, cursor.y + 9);
        for (let li = 0; li < lines.length; li++) {
          if (li > 0) ensureSpace(cursor, 12);
          cursor.doc.text(lines[li], MARGIN + 38, cursor.y + 9);
          cursor.y += 12;
        }
      });
      spacer(cursor, 8);
    });

    // Monitoring
    newPage(cursor);
    writeHeading(cursor, "Monitoring plan");
    writeText(cursor, "Cheap, repeatable monthly ritual. The bookmark bundle lives in competitor-monitoring.md at the project root.", { color: 130 });
    spacer(cursor, 6);
    writeSubheading(cursor, "Monthly ritual (30 minutes)");
    [
      "Open the bookmark folder; check pricing & changelog page for each competitor.",
      "Skim Crunchbase for funding/headcount deltas.",
      "Skim LinkedIn jobs for new role types (signals strategy shifts).",
      "Log meaningful changes in a single Linear issue tagged 'compete'.",
      "If a change is material (pricing cut, EOR-adjacent SKU, leadership hire), trigger an out-of-cycle review.",
    ].forEach((s, i) => writeBullet(cursor, s, `${i + 1}.`));
    spacer(cursor, 6);
    writeSubheading(cursor, "Activation package — pick one channel");
    [
      ["Slack RSS", "Use /feed slash command to add the seven competitor blog/changelog RSS feeds into a #compete channel."],
      ["Teams RSS", "Use the RSS connector on a 'Compete' channel; paste the same feed list."],
      ["Google Alerts", "One alert per competitor name + 'pricing' / 'launches' / 'funding'; weekly digest to ops@."],
    ].forEach(([t, b]) => {
      ensureSpace(cursor, 30);
      cursor.doc.setFont("helvetica", "bold");
      cursor.doc.setFontSize(10);
      cursor.doc.setTextColor(40);
      cursor.doc.text(t, MARGIN, cursor.y + 10);
      cursor.doc.setFont("helvetica", "normal");
      cursor.doc.setFontSize(9);
      cursor.doc.setTextColor(80);
      const lines = cursor.doc.splitTextToSize(b, CONTENT_W) as string[];
      let ly = cursor.y + 22;
      lines.forEach((l) => {
        cursor.doc.text(l, MARGIN, ly);
        ly += 11;
      });
      cursor.y = ly + 6;
    });
    spacer(cursor, 6);
    ensureSpace(cursor, 50);
    cursor.doc.setFillColor(254, 243, 199);
    cursor.doc.setDrawColor(252, 211, 77);
    cursor.doc.roundedRect(MARGIN, cursor.y, CONTENT_W, 50, 8, 8, "FD");
    cursor.doc.setFont("helvetica", "bold");
    cursor.doc.setFontSize(10);
    cursor.doc.setTextColor(120, 53, 15);
    cursor.doc.text("OWNER ACTION", MARGIN + 14, cursor.y + 18);
    cursor.doc.setFont("helvetica", "normal");
    cursor.doc.setFontSize(9);
    cursor.doc.setTextColor(60);
    const oa = cursor.doc.splitTextToSize(
      "Tell the Mentalyc team which channel to activate (Slack RSS / Teams RSS / Google Alerts). The feed bundle is ready to paste — see competitor-monitoring.md at the project root.",
      CONTENT_W - 28
    ) as string[];
    let oay = cursor.y + 32;
    oa.forEach((l) => {
      cursor.doc.text(l, MARGIN + 14, oay);
      oay += 11;
    });
    cursor.y += 56;
  }

  // Pass 1: count pages by rendering once with placeholder totals.
  renderAll(c);
  const totalPages = c.pageNum;

  // Pass 2: re-render in a fresh doc with correct totals
  const finalDoc = new jsPDF({ unit: "pt", format: "letter" });
  const fc: PdfCursor = { doc: finalDoc, pageNum: 1, totalPages, y: 50 };
  renderAll(fc);

  // Save
  finalDoc.save("Mentalyc-Competitive-Analysis-May-2026.pdf");
}

export default function CompetitiveAnalysisPage() {
  const [, setLocation] = useLocation();
  const [generating, setGenerating] = useState(false);

  const { data, isLoading, isError } = useQuery<CompetitiveData>({
    queryKey: ["/api/admin/competitive-data"],
  });

  const competitorNames = data
    ? ["Mentalyc", ...data.competitors.map((c) => c.name)]
    : [];

  const handleDownload = async () => {
    if (!data) return;
    setGenerating(true);
    try {
      generatePdf(data, competitorNames);
    } finally {
      setTimeout(() => setGenerating(false), 400);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading competitive analysis…</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Failed to load competitive analysis data.</div>
      </div>
    );
  }

  const pages: Array<{ key: string; render: () => JSX.Element }> = [
    { key: "cover", render: () => <CoverPage data={data} /> },
    { key: "exec", render: () => <ExecutiveSummaryPage /> },
    { key: "method", render: () => <MethodologyPage data={data} /> },
    ...data.competitors.map((_, i) => ({
      key: `competitor-${i}`,
      render: () => <CompetitorPage index={i} data={data} />,
    })),
    { key: "matrix", render: () => <MatrixPage data={data} competitorNames={competitorNames} /> },
    { key: "map", render: () => <PositioningMapPage data={data} /> },
    { key: "kano", render: () => <KanoWhiteSpacePage data={data} /> },
    { key: "positioning", render: () => <PositioningPage data={data} /> },
    { key: "recommendations", render: () => <RecommendationsPage data={data} /> },
    { key: "monitoring", render: () => <MonitoringPage /> },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              data-testid="button-back-to-home"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
            <div className="hidden sm:block h-5 w-px bg-slate-200" />
            <div className="hidden sm:block">
              <div className="text-xs text-slate-500">Strategy report</div>
              <div className="text-sm font-semibold text-slate-900">
                Mentalyc Competitive Analysis · May 2026
              </div>
            </div>
          </div>
          <Button
            onClick={handleDownload}
            disabled={generating}
            data-testid="button-download-pdf"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            {generating ? "Generating…" : "Download PDF"}
          </Button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {pages.map((p, i) => (
          <PageShell key={p.key} pageNumber={i + 1} totalPages={pages.length}>
            {p.render()}
          </PageShell>
        ))}
      </main>
      <footer className="py-10 text-center text-xs text-slate-500">
        Mentalyc · Confidential strategy doc · Generated May 2026
      </footer>
    </div>
  );
}
