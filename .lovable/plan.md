# Implementation Plan: Import System and UI Improvements

**STATUS: ✅ IMPLEMENTED**

This plan addressed 8 feedback items from the team shadowing session, focusing on the import system, required field handling, and "Need Attention" tab improvements.

---

## Summary of Issues (All Fixed)

| # | Issue | Priority |
|---|-------|----------|
| 1 | Green vs Blue mark meaning unclear in import mapping | Low |
| 2 | Missing asterisks on required fields in import screen | Medium |
| 3 | Validation display UI issues | Medium |
| 4 | Import preview formatting (too much line spacing) | Low |
| 5 | Partial field import not working (store code + specific fields only) | High |
| 6 | Remove Lat/Long from required fields, add asterisks to actual required fields | High |
| 7 | Social media account-wide settings cannot remove all URLs | Medium |
| 8 | "Need Attention" tab lacks explanation of why items need attention | High |

---

## Issue 1: Green vs Blue Mark Explanation

### Current Behavior
- **Green checkmark**: Column mapped to a **required** field (currently only `businessName`)
- **Blue checkmark**: Column mapped to an **optional** field

The algorithm checks:
1. If a column header matches known field aliases (e.g., "store code" matches `storeCode`)
2. Matching is done via normalized comparison (lowercase, spaces removed)
3. Green = `requiredFields.includes(mappedField)` where `requiredFields = ['businessName']`

### Solution
Add a legend/tooltip in the mapping step explaining the color meanings:
- Add a small info section above the column list explaining green = required field, blue = optional field
- 2) add essentiailFields to the Green check list, because essential fields are actually mandatory for validation (being active) so if you don't do that - it will give false information to the user. 

---

## Issue 2 & 6: Required Fields and Asterisks

### Current State
- `requiredFields` array only contains `['businessName']`
- `essentialFields` (for completeness check) = `['businessName', 'addressLine1', 'country', 'primaryCategory']`
- Latitude/Longitude are NOT in required fields (just have validation range checks)

### Problem
The asterisk appears based on `requiredFields` which is incomplete. The validation schema requires:
- `storeCode` (required in schema)
- `businessName` (required in schema)
- `addressLine1` (required in schema)
- `country` (required in schema)
- `primaryCategory` (required in schema)

But `requiredFields` in ImportDialog only shows `['businessName']` with asterisk.

### Solution
1. Update `requiredFields` in ImportDialog to match the actual required fields from the validation schema:
   ```
   ['storeCode', 'businessName', 'addressLine1', 'country', 'primaryCategory']
   ```
2. Lat/Long should NOT be added (they are optional with range validation, no input is a valid input for lat long- should not create issues)
3. Add asterisks to all required fields in the mapping UI

---

## Issue 3: Validation Display UI Issue

### Problem
The validation errors in the preview step use HoverCards which may not be obvious to users.

### Solution
Make validation errors more prominent:
- Show inline validation summary at the top of preview
- Use more visible error indicators (not just hover)
- Consider expandable error list
- Make sure it does not go off the screen because of UI mapping. 

---

## Issue 4: Import Preview Formatting

### Problem
The preview table has too much vertical spacing between rows.

### Solution
Reduce padding in table cells from `p-2` to `p-1.5` or `py-1 px-2` for more compact display.

---

## Issue 5: Partial Field Import (Most Critical)

### Current Problem
When importing a file with only `storeCode` and one field (e.g., `website`):
1. The system detects it as a "duplicate" (existing store code)
2. Warning says "location will be completely overwritten"
3. After import, location goes to "Need Attention" with all old data preserved

This is because the override logic uses `update()` which should only update provided fields, but the `businessesToInsert` construction sets status to 'pending' if essential fields are missing.

### Root Cause Analysis
The import process:
1. Maps all columns from import file to business fields
2. For existing locations, it tracks field changes and updates
3. BUT: If essential fields are missing from import, `checkBusinessCompleteness()` returns false
4. This sets `status = 'pending'` even though the existing location was complete

### Solution: "Merge Import" Mode 
Add a new import mode for partial field updates:
1. Detect when import file only contains `storeCode` + limited fields
2. For matched existing locations, only update the fields present in the import (merge behavior)
3. DO NOT reset status to 'pending' if the existing location was already 'active'
4. Update the override warning text to accurately describe merge behavior:
   - "These fields will be updated: website" instead of "completely overwritten"

### Technical Changes
```text
1. In importData(), when allowOverride is true:
   - Get existing business data
   - Only update fields that are explicitly mapped AND have values in import
   - Preserve existing values for unmapped/empty fields
   - Preserve status if existing location was 'active' and still passes completeness check

2. Update the duplicate detection UI:
   - Show which specific fields will be updated
   - Clarify this is a merge, not a replacement

3. Update the UI to add the Merge Import button next to the Import button - make it a different colour, Sage is fine. 
```

---

## Issue 7: Social Media Remove All Option

### Current Problem
The `AccountSocialsDialog` only allows adding/updating URLs, not removing all URLs from all locations.

### Current Logic
- `onSubmitAll()` filters out empty URLs, so leaving all fields empty shows "No changes" error
- Need explicit "Remove All" action

### Solution
Add a "Remove All Social Links" button or tab that:
1. Confirms the action with user
2. Sets `socialMediaUrls = []` for all locations in the client
3. Shows success toast with count of affected locations

---

## Issue 8: "Need Attention" Explanation

### Current Problem
Locations in "Need Attention" tab show a validation badge but:
- No clear explanation of WHY they need attention
- User has to hover over small badge to see issues
- No overview of all issues across pending locations

### Current Logic
A location appears in "Need Attention" if:
- `status === 'pending'` OR `is_async === true`

Status becomes 'pending' when:
- Business is incomplete (missing essential fields)
- Auto-generated store code was used
- Import without explicit store code

### Solution
1. Add a clickable dialog/popover (not just hover) that shows detailed issues
2. Add a summary banner at the top of "Need Attention" tab explaining common reasons:
   - Missing required fields
   - Auto-generated store codes that need replacement
   - Async locations (for Energie 360)
3. For each location, show an expandable issues list or click-to-open detail dialog

### Technical Implementation
Replace HoverCard with a Dialog trigger:
```text
- When user clicks the validation badge, open a modal
- Modal shows:
  - List of validation errors with suggestions
  - Fields that are missing
  - Clear action items to fix
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ImportDialog.tsx` | 1. Update `requiredFields` array 2. Add mapping legend 3. Fix preview table spacing 4. Implement merge import logic 5. Update override warning text |
| `src/components/BusinessTableView.tsx` | Replace HoverCard with Dialog for validation errors |
| `src/components/AccountSocialsDialog.tsx` | Add "Remove All Social Links" action |
| `src/pages/ClientDashboard.tsx` | Add summary banner for Need Attention tab |
| `src/pages/Dashboard.tsx` | Add summary banner for Need Attention tab |
| `src/pages/StoreOwnerDashboard.tsx` | Add summary banner for Need Attention tab |

---

## Technical Implementation Details

### ImportDialog.tsx Changes

```text
Line 117: Change requiredFields
FROM: const requiredFields = ['businessName'];
TO:   const requiredFields = ['storeCode', 'businessName', 'addressLine1', 'country', 'primaryCategory'];

Lines 856-1022: Add mapping legend above column list
- Add small info box explaining: "Green = Required field, Blue = Optional field"

Lines 1050-1122: Preview table styling
- Reduce table cell padding for more compact display

Lines 686-725: Override/merge logic
- Only update fields that are present in import
- Preserve existing status for complete locations
```

### AccountSocialsDialog.tsx Changes

```text
Add new tab or button: "Remove All Social Links"
- Confirmation dialog before removal
- Update all businesses with empty socialMediaUrls array
- Success toast showing affected count
```

### BusinessTableView.tsx Changes

```text
Lines 234-277: renderValidationBadge function
- Replace HoverCard with Dialog component
- Show full validation errors in scrollable modal
- Add action suggestions for each error
```

---

## User-Facing Improvements

1. **Import mapping screen**: Clear legend showing green = required, blue = optional
2. **Import preview**: More compact table, clearer merge vs overwrite messaging
3. **Partial imports**: Properly merge fields without breaking existing data
4. **Need Attention tab**: Clickable detailed explanation instead of hover-only
5. **Social media settings**: Ability to remove all social links account-wide
