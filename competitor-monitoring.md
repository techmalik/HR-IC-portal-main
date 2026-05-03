# Mentalyc — Competitor Monitoring

**Owner:** Strategy / Product Marketing
**Cadence:** 30 minutes, first Monday of every month
**Companion artifact:** `/competitive-analysis` (web preview + downloadable PDF)

---

## 30-minute monthly ritual

1. **Pricing pages (5 min).** Open every competitor pricing page side-by-side. Look for: new tier, removed tier, change in starting price, new add-on SKU.
2. **Changelogs / What's new (10 min).** Skim the official changelog or product blog. Tag launches that touch contractor ops, EOR expansion, RBAC, or reporting.
3. **Funding & headcount (5 min).** Crunchbase + LinkedIn employee count. Flag any new round, layoffs, or rapid hiring spike (>10% in 90 days).
4. **Hiring signals (5 min).** Skim LinkedIn Jobs for unusual role types (e.g. "Head of EOR", "VP of Compliance", "Group PM, SMB"). Hiring tells you the next 6 months of roadmap.
5. **Log the delta (5 min).** Open one Linear issue tagged `compete`, paste the deltas, close it. If anything is **material** (price cut > 20%, EOR-adjacent SKU, leadership hire, M&A rumor), trigger an out-of-cycle review — don't wait for next month.

---

## Bookmark bundle

Save these as a folder in your browser. Drag-drop into your bookmarks bar as **Compete · Mentalyc**.

### Pricing & changelog
- Deel — pricing: https://www.deel.com/pricing  ·  changelog: https://www.deel.com/changelog
- Remote — pricing: https://remote.com/pricing  ·  changelog: https://remote.com/blog/category/product-updates
- Rippling — pricing: https://www.rippling.com/pricing  ·  changelog: https://www.rippling.com/blog/category/product
- Worksuite — pricing: https://worksuite.com/pricing  ·  blog: https://worksuite.com/blog
- Bonsai — pricing: https://www.hellobonsai.com/pricing  ·  changelog: https://www.hellobonsai.com/whats-new
- Plane — pricing: https://www.plane.com/pricing  ·  changelog: https://www.plane.com/blog
- Multiplier — pricing: https://www.usemultiplier.com/pricing  ·  blog: https://www.usemultiplier.com/blog

### Funding & headcount
- Deel — https://www.crunchbase.com/organization/deel
- Remote — https://www.crunchbase.com/organization/remote-2
- Rippling — https://www.crunchbase.com/organization/rippling
- Worksuite — https://www.crunchbase.com/organization/shortlist
- Bonsai — https://www.crunchbase.com/organization/hello-bonsai
- Plane (Pilot) — https://www.crunchbase.com/organization/pilot-co
- Multiplier — https://www.crunchbase.com/organization/multiplier-1c93

### Voice of customer
- G2 Deel: https://www.g2.com/products/deel/reviews
- G2 Remote: https://www.g2.com/products/remote-com/reviews
- G2 Rippling: https://www.g2.com/products/rippling/reviews
- G2 Worksuite: https://www.g2.com/products/worksuite-formerly-shortlist/reviews
- G2 Bonsai: https://www.g2.com/products/bonsai/reviews
- G2 Plane: https://www.g2.com/products/plane/reviews
- G2 Multiplier: https://www.g2.com/products/multiplier/reviews

### Strategic direction (LinkedIn jobs)
- Deel: https://www.linkedin.com/company/deel/jobs/
- Remote: https://www.linkedin.com/company/remote-com/jobs/
- Rippling: https://www.linkedin.com/company/rippling-com/jobs/
- Worksuite: https://www.linkedin.com/company/worksuite-hq/jobs/
- Bonsai: https://www.linkedin.com/company/hello-bonsai/jobs/
- Plane: https://www.linkedin.com/company/plane-payroll/jobs/
- Multiplier: https://www.linkedin.com/company/usemultiplier/jobs/

### Messaging history
- Wayback Machine — paste any pricing/landing URL above into https://web.archive.org/

---

## Activation package — pick ONE channel

Pick the channel your team already lives in. Don't create a new home for this. **The owner (you) needs to confirm the choice.**

### Option A — Slack RSS
1. In a Slack channel called `#compete`, run `/feed add <url>` for each RSS feed below.
2. Pin the channel description to: "Auto-feed of competitor product/pricing changes. Owned by [name]. Monthly review first Monday."

### Option B — Microsoft Teams RSS
1. In a Teams channel called `Compete`, add the RSS connector.
2. Paste the same feed list. Same outcome, MS-flavoured.

### Option C — Google Alerts (zero-tool option)
1. Visit https://www.google.com/alerts
2. Create one alert per competitor, with query: `"<Competitor Name>" (pricing OR launches OR funding OR layoffs)`
3. Frequency: weekly digest. Deliver to: ops@mentalyc.com (or owner's address).

### RSS feed bundle (paste into Slack/Teams)
```
https://www.deel.com/blog/feed
https://remote.com/blog/feed.xml
https://www.rippling.com/blog/feed
https://worksuite.com/blog/feed
https://www.hellobonsai.com/blog.rss
https://www.plane.com/blog/feed
https://www.usemultiplier.com/blog/rss.xml
```

> If a feed URL 404s on a future check, fall back to Google Alerts for that specific competitor — vendors rotate their feed paths once or twice a year.

---

## Material-change trigger list

Treat **any** of the following as a P1 — escalate same-day, don't wait for the monthly review:

- Pricing cut > 20% on any tier we compete with
- New SKU in our wedge (e.g. Deel launches a "Contractor Lite" plan under $30/seat)
- Acquisition (acquirer or acquired)
- C-suite hire signaling new direction (Head of SMB, VP of Compliance, GM of new region)
- Layoffs > 10% of headcount
- Funding round (new round → likely category push)
- Public security incident or data breach
- Negative G2 trend: sustained 1-3 star reviews on a feature where Mentalyc is strong (timesheet approvals, OOO, RBAC) — opportunity to land air cover content

---

## Lightweight log template

Paste this at the top of the monthly Linear issue:

```
## Compete · YYYY-MM

### Pricing changes
- [Competitor] —

### Product launches
- [Competitor] —

### Funding / headcount
- [Competitor] —

### Hiring signals
- [Competitor] —

### Material changes (escalate)
- None / [details]

### Action items for Mentalyc
- [ ]
```

That's it. 30 minutes, one issue, no dashboards, no Klue/Crayon spend until we have a sales team that needs full battlecards in CRM.
