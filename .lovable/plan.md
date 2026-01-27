

# Implementation Plan: Asynchronous Location Detection for Energie 360°

## Overview
Add an `is_async` boolean field to detect Energie 360° locations that exist in Jasoner but have disappeared from the Eco-Movement API feed. These locations will be flagged, displayed in a dedicated tab, and excluded from JSON exports.

---

## Database Changes

### 1. Add `is_async` Column to Businesses Table
- Add `is_async BOOLEAN NOT NULL DEFAULT false` to the businesses table
- This defaults to `false` for all existing and new locations
- Only Energie 360° locations will ever have this set to `true`

---

## Backend Changes

### 2. Update Eco-Movement Import Function
Modify `supabase/functions/import-eco-movement/index.ts` to:

**Detection Logic (after processing all locations):**
1. Get all Energie 360° businesses that currently have `is_async = false`
2. Compare their store codes against the API feed store codes
3. Locations in Jasoner BUT NOT in the current feed get flagged `is_async = true`
4. Track this change in `business_field_history` with source `eco_movement`

**Re-sync Logic (during location processing):**
1. When a location IS in the feed AND exists in Jasoner with `is_async = true`
2. Set `is_async = false` (it's back in sync)
3. Track this change in history

### 3. Update JSON Export Functions
Modify these functions to exclude async locations:

**`supabase/functions/generate-json-export/index.ts`:**
- Change query from `.eq('status', 'active')` to `.eq('status', 'active').eq('is_async', false)`

**`supabase/functions/crud-backup/index.ts`:**
- Add `.eq('is_async', false)` or filter out async in memory

**`supabase/functions/scheduled-backup/index.ts`:**
- Add `.eq('is_async', false)` to the query

---

## Frontend Changes

### 4. Update TypeScript Type
Add to `src/types/business.ts`:
```typescript
is_async?: boolean;
```

### 5. Update Client Dashboard (Energie 360° Only)
Modify `src/pages/ClientDashboard.tsx`:

**Add new tab state:**
- Extend `activeTab` type to include `'async'`

**Add new tab (only for Energie 360°):**
- "Asynchronous Locations" tab showing businesses where `is_async === true`
- Count badge showing number of async locations

**Update Need Attention tab:**
- Include businesses where `status === 'pending'` OR `is_async === true`
- This ensures async locations get visibility in the existing attention tab

**Visual indicator:**
- Add a badge or icon to clearly show why a location is flagged as async

### 6. Update Frontend JSON Export
Modify `src/components/JsonExport.tsx`:
- Filter out businesses where `is_async === true` in addition to the existing active status check

---

## Technical Details

### Query for Detecting Async Locations (in edge function)
```text
1. After import completes, get all store codes from the API feed
2. Query businesses WHERE client_id = ENERGIE_360 AND is_async = false
3. For each business NOT in the API feed store codes → set is_async = true
4. Businesses that ARE in the feed AND have is_async = true → set is_async = false
```

### Tab Filtering Logic
- **Active**: `status === 'active' AND is_async === false`
- **Need Attention**: `status === 'pending' OR is_async === true`
- **New**: Created within 3 days (existing logic, no change)
- **Asynchronous** (new, Energie 360° only): `is_async === true`

---

## Edge Cases Handled

1. **Non-Energie 360° clients**: Boolean defaults to `false`, never set to `true`
2. **Manually created locations**: Only flagged if they somehow appeared in the feed before and then disappeared (unlikely for CRUD-only)
3. **Location returns to feed**: Automatically unflagged during next import
4. **Manual unflagging**: User can manually edit to set `is_async = false` if needed

---

## Summary of Files to Modify

| File | Change Type |
|------|-------------|
| Database migration | Add `is_async` column |
| `supabase/functions/import-eco-movement/index.ts` | Add detection and re-sync logic |
| `supabase/functions/generate-json-export/index.ts` | Exclude async from export |
| `supabase/functions/crud-backup/index.ts` | Exclude async from backup |
| `supabase/functions/scheduled-backup/index.ts` | Exclude async from backup |
| `src/types/business.ts` | Add `is_async` field |
| `src/pages/ClientDashboard.tsx` | Add Asynchronous tab, update Need Attention logic |
| `src/components/JsonExport.tsx` | Exclude async from frontend export |

