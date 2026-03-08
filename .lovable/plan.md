

# SiteDoctor AI - Implementation Plan

## Overview
Build a SaaS website audit tool with Supabase auth, Firecrawl-powered scanning, and a modern dashboard UI.

## Prerequisites (before coding)
1. **Connect Supabase** - external Supabase project for auth, database, and edge functions
2. **Connect Firecrawl** - connector for website scraping/scanning

## Database Schema

**profiles** table - user metadata (name, avatar, created_at)
**scan_reports** table - stores audit results (user_id, url, status, results JSON, created_at)
**user_roles** table - role-based access (using security definer pattern)

## Pages & Routes

| Route | Page | Auth Required |
|-------|------|---------------|
| `/` | Landing page | No |
| `/login` | Login/Signup | No |
| `/reset-password` | Password reset | No |
| `/pricing` | Pricing (Free/Pro/Enterprise) | No |
| `/dashboard` | User dashboard | Yes |
| `/scan` | Website scanner | Yes |
| `/report/:id` | Audit report view | Yes |
| `/reports` | Saved reports history | Yes |

## Architecture

```text
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  React App  │────▶│  Supabase    │────▶│  Firecrawl │
│  (Frontend) │     │  Edge Fns    │     │  API       │
│             │     │  + Auth + DB │     │            │
└─────────────┘     └──────────────┘     └────────────┘
```

## Key Components

### Layout
- **AppSidebar** - sidebar navigation (Dashboard, Scanner, Reports, Pricing)
- **DashboardLayout** - wraps authenticated pages with SidebarProvider + header

### Landing Page
- Hero section with CTA
- Features grid (Performance, SEO, Accessibility, Security audits)
- Pricing preview
- Professional Stripe/Vercel-inspired design with dark theme option

### Dashboard
- Summary cards (total scans, recent score, reports saved)
- Recent scans list
- Quick scan input

### Website Scanner
- URL input form with validation
- Scanning progress indicator
- Calls `firecrawl-scrape` edge function to fetch page content
- Calls `analyze-website` edge function that processes scraped data and generates audit scores

### Audit Report Page
- Overall score (circular chart)
- Category scores: Performance, SEO, Accessibility, Best Practices
- Detailed findings with severity badges
- Actionable recommendations
- Download as PDF button (using browser print/jsPDF)

### Reports History
- Table of past scans with URL, date, score, status
- Click to view full report
- Delete reports

## Edge Functions

1. **firecrawl-scrape** - scrapes target URL via Firecrawl (markdown + html + links + screenshot formats)
2. **analyze-website** - takes scraped content, analyzes HTML structure, meta tags, heading hierarchy, image alts, link structure, and generates audit scores/recommendations

## Scanning Logic (analyze-website edge function)
The analysis will be rule-based, examining the scraped HTML/markdown for:
- Meta tags presence (title, description, viewport, OG tags)
- Heading hierarchy (h1-h6 structure)
- Image alt attributes
- Internal/external link counts
- Mobile responsiveness indicators
- Page content length and structure
- Security headers (if available)

Scores generated per category (0-100) with specific findings and fix suggestions.

## UI Design
- Color scheme: dark navy primary, teal/green accents for scores
- Card-based layouts with subtle shadows
- Recharts for score visualizations (radar chart, bar charts)
- Clean typography, generous whitespace
- Responsive: mobile-friendly with collapsible sidebar

## Implementation Order
1. Connect Supabase + Firecrawl
2. Set up database tables and auth
3. Build layout (sidebar, auth pages)
4. Landing page + Pricing page
5. Dashboard page
6. Scanner + edge functions
7. Report page with charts
8. Reports history
9. PDF download

