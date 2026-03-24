

## Problem

The country filter dropdown shows duplicate entries (e.g., "Czech Republic (CZ)" twice, "Austria (AT)" twice) because the `businesses.country` field has inconsistent raw values in the database. The `uniqueCountries` array in `BusinessTableView.tsx` is built using `new Set(businesses.map(b => b.country))`, which treats "CZ" and " CZ" or "cz" as different values, even though `formatCountryDisplay()` renders them identically.

## Fix

**File: `src/components/BusinessTableView.tsx`** (line ~86)

Normalize country values to uppercase ISO codes before deduplication using the existing `getCountryCode` helper:

1. Import `getCountryCode` from `CountrySelect.tsx`
2. Change the `uniqueCountries` computation to normalize each `b.country` to its ISO code via `getCountryCode()` before applying `Set` deduplication
3. Sort the resulting list by display name for consistency

```
const uniqueCountries = [...new Set(
  businesses.map(b => getCountryCode(b.country || '')).filter(Boolean)
)].sort((a, b) => formatCountryDisplay(a).localeCompare(formatCountryDisplay(b)));
```

Also ensure the country filter comparison normalizes the business country value the same way, so filtering still works correctly when a business has a non-standard country value.

This is a one-file, ~5 line change.

