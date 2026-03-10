# Memory: index.md
Updated: now

# SiteDoctor AI - Project Memory

## Design System
- Fonts: Inter (body), Space Grotesk (headings/display)
- Primary: blue `220 70% 50%`, Accent: teal `165 70% 42%`
- Score colors: excellent (teal), good (green), average (yellow), poor (red)
- Dark theme supported via `.dark` class

## Architecture
- Supabase Cloud for auth, database, edge functions
- Firecrawl connector for website scraping
- Edge functions: `firecrawl-scrape`, `analyze-website`, `pagespeed-insights`, `ai-suggestions`, `keyword-research`, `ranking-opportunities`, `generate-seo-report`
- Tables: `profiles`, `scan_reports`, `user_roles`, `user_subscriptions`, `saved_keywords`, `seo_reports`, `tracked_websites`

## Subscription System
- Free: 3 scans/month, basic reports
- Premium: unlimited scans, keyword research, ranking opportunities, SEO reports, advanced PDF
- Enterprise: team features (UI only)
- Scan limit enforced via `useSubscription` hook counting scan_reports per month
- PremiumGate component blocks premium features for free users

## Pricing Model
- Free / Premium ($29) / Enterprise ($99)

## Key Decisions
- Billing is UI-only for now (no Stripe integration)
- AI features use Lovable AI gateway (gemini-3-flash-preview)
- Subscription auto-created on signup via handle_new_user trigger
- PDF export via jsPDF
- Sidebar navigation with dark theme, PRO badges on premium items
