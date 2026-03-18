# Implementation Plan: Dashboard Summary Cards, Empty States, and Toast Consolidation

## 1. Dashboard Summary Cards

Add a row of metric cards between the header/title area and the tabs on all three dashboards: `Dashboard.tsx`, `ClientDashboard.tsx`, and `StoreOwnerDashboard.tsx`.

**Cards to display:**

- **Total Locations** — `businesses.length`
- **Active** — `activeBusinesses.length` (green indicator)
- **Need Attention** — `pendingBusinesses.length` (amber/red indicator)
  &nbsp;

Each card: icon + label + large number + optional color-coded badge. Uses existing `Card` component. Responsive: 4-column grid on desktop, 2-column on mobile.

**Files changed:** `src/pages/Dashboard.tsx`, `src/pages/ClientDashboard.tsx`, `src/pages/StoreOwnerDashboard.tsx`

---

## 2. Empty States with Clear CTAs

Replace the plain-text empty states with illustrated, role-aware empty states:


| Dashboard                  | Current                                             | New                                                                                                    |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `Dashboard.tsx` (user)     | "No businesses found" + Add button (already decent) | Polish: add Upload/Import CTA alongside Add button                                                     |
| `Dashboard.tsx` active tab | "No active businesses found."                       | "All locations need attention — switch to the Need Attention tab to fix issues."                       |
| `StoreOwnerDashboard.tsx`  | "No locations assigned to you yet."                 | Add icon, explain: "Your admin hasn't assigned any locations to you yet. Contact your administrator."  |
| `ClientDashboard.tsx`      | spinner only, no zero-state                         | Add: "No locations for this client yet — Import or Add your first location." with Import + Add buttons |


**Files changed:** Same three dashboard files.

---

## 3. Toast Consolidation — Standardize on Sonner

The project has **two toast systems** mounted in `App.tsx`: `<Toaster />` (shadcn/use-toast) and `<Sonner />`. ~40 files import from `@/hooks/use-toast`. No files import sonner's `toast` directly for triggering — sonner is only mounted, never called.

**Plan:**

1. Remove `<Toaster />` (shadcn) from `App.tsx`, keep only `<Sonner />`
2. In all ~40 files, replace `import { toast } from '@/hooks/use-toast'` with `import { toast } from 'sonner'`
3. Update call signatures: `toast({ title, description, variant: "destructive" })` becomes `toast.error(description)` or `toast.success(description)` — sonner uses positional string args, not object
4. For calls using `useToast()` hook (e.g., `RoleChangeDialog.tsx`), replace with direct `toast` import from sonner
5. Delete `src/hooks/use-toast.ts`, `src/components/ui/toast.tsx`, and `src/components/ui/toaster.tsx` (now unused)

**Files changed:** `src/App.tsx`, ~40 component/page files, 3 files deleted.

---

## Summary of Scope


| Task                | Files touched        | Effort |
| ------------------- | -------------------- | ------ |
| Summary cards       | 3 dashboard pages    | Low    |
| Empty states        | 3 dashboard pages    | Low    |
| Toast consolidation | ~43 files, 3 deleted | Medium |
