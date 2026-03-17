# Local SEO Completeness Score & Suggestions Engine

## Overview

Build a completeness scoring system and actionable suggestions framework for every location and client, based on local SEO best practices. This includes a new "SEO Health" tab/view that scores locations, surfaces improvement suggestions, and flags locations below a configurable threshold.

## What gets scored — Local SEO Completeness Framework

Each location is evaluated against weighted local SEO factors. Fields are grouped into categories with point values:

```text
Category                    Fields                                      Weight
─────────────────────────────────────────────────────────────────────────────────
Core Identity (25%)         businessName, primaryCategory,              High
                            additionalCategories, fromTheBusiness
Address & Geo (20%)         addressLine1, city, postalCode, country,    High
                            latitude, longitude
Contact & Web (15%)         primaryPhone, website,                      Medium
                            appointmentURL, socialMediaUrls
Opening Hours (15%)         mon-sun hours (all 7 days filled),          Medium
                            specialHours
Photos & Media (15%)        logoPhoto, coverPhoto, otherPhotos          Medium
                            (bonus for 3+ other photos)
Services & Extras (10%)     customServices, labels, menuURL,            Low
                            reservationsURL, orderAheadURL
─────────────────────────────────────────────────────────────────────────────────
Total: 100%
```

Each field contributes points. A location with everything filled scores 100%. Missing optional-but-recommended fields lower the score with specific suggestions.

## New components and files

1. `**src/lib/seoScoring.ts**` — Pure scoring logic
  - `calculateSeoScore(business: Business): SeoScoreResult` — returns overall score (0-100), category breakdown, and suggestion list
  - Each suggestion has: field name, priority (high/medium/low), actionable message, SEO impact description
  - Threshold constant (e.g., 70%) for "needs improvement" flagging
2. `**src/components/SeoScoreCard.tsx**` — Per-location score display
  - Circular progress indicator showing score percentage
  - Color-coded: green (80+), yellow (50-79), red (below 50)
  - Expandable suggestions list grouped by category
  - Each suggestion shows the field, what's missing, and why it matters for local SEO
3. `**src/components/ClientSeoOverview.tsx**` — Client-level aggregate view
  - Average score across all locations
  - Distribution chart (how many locations in each score band)
  - "Lowest scoring locations" table with quick-edit links
  - Top 5 most common missing fields across the client's portfolio
4. **Integration into existing dashboards**
  - Add an "SEO Health" tab alongside "Active" and "Need Attention" in Dashboard, ClientDashboard, ClientAdminPanel
  - Show a small score badge on each location row in the table view
  - Locations below threshold get surfaced in the SEO Health tab with prioritized suggestions

## Suggestions engine

Beyond completeness, the engine checks for quality signals:

- **Business description length** — flag if under 100 chars or over 750
- **Photo count** — recommend 3+ other photos, flag if zero
- **Opening hours completeness** — flag if fewer than 5 days have hours set
- **Social media presence** — suggest adding at least 2 social profiles
- **Website URL** — flag if missing entirely
- **Coordinates** — flag if latitude/longitude are missing (critical for map placement)
- **Category optimization** — suggest adding additional categories if only primary is set
- **Special hours** — suggest setting holiday hours if none defined

## Competitor Analysis 


Add a "Benchmark" section where admins can manually input competitor data (e.g., average score for the industry/region). Compare each location's score against this benchmark. 

**Trend tracking**: Store weekly scores per location in a new table, show improvement/decline over time

**Export SEO report**: Generate a PDF/CSV report of SEO health per client for account managers

**Category recommendations**: Based on the primary category, suggest common additional categories used by similar businesses

## Technical approach

- All scoring logic is client-side (pure TypeScript, no new DB tables needed for v1)
- No new edge functions required for the base feature
- Scoring runs on already-fetched business data — no additional API calls
- For trend tracking (v2), a `seo_score_history` table would be added