## Plan: Bulk Geocode All Locations (Account-Wide Setting)

### Overview

Add a "Generate Coordinates" card to SettingsDialog that geocodes all locations missing lat/long using their address fields. Uses Nominatim (same as existing per-location geocoding) with rate limiting (1 req/sec per Nominatim policy). Produces an error report for failed locations.

### Architecture

**New component: `BulkGeocodeDialog.tsx**`

- Confirmation dialog showing count of locations missing coordinates
- Progress bar during processing (X of Y completed)
- Rate-limited sequential geocoding (1 request/second to respect Nominatim usage policy)
- Real-time status: success count, failure count, current location being processed
- On completion: shows summary with downloadable error report for failures
- Error report table: storeCode, businessName, addressLine1, city, country, error reason
- Cancel button to abort mid-process

**Processing logic (client-side, reusing existing Nominatim pattern from LocationMap.tsx):**

1. Query all businesses for the client where `latitude IS NULL OR longitude IS NULL`
2. Filter to those with at least `addressLine1` populated (skip others, add to error report as "No address")
3. For each location, call Nominatim structured search (street + city + country), fallback to freeform
4. On success: update the business record's latitude/longitude via Supabase
5. On failure: log to error report array (storeCode, name, address, reason)
6. 1-second delay between requests

**SettingsDialog changes:**

- Add a new Card in the left column with MapPin icon: "Generate Coordinates"
- Description: "Auto-detect GPS coordinates for all locations without lat/long using their address."
- Button opens BulkGeocodeDialog

**Validation:**

- Pre-check: count locations missing coordinates; if zero, show info toast "All locations already have coordinates"
- Skip locations with no addressLine1 (report as error)
- Validate returned lat/lon are within valid ranges (-90 to 90, -180 to 180)

### Files to create/modify

1. **Create** `src/components/BulkGeocodeDialog.tsx` - main dialog with progress UI and geocoding logic
2. **Modify** `src/components/SettingsDialog.tsx` - add the new card and dialog trigger  


### No database or edge function changes needed

All geocoding happens client-side using existing Nominatim API (same as LocationMap.tsx). Business updates use existing Supabase RLS policies already in place for update operations.  
  
You also need to add this function to multiedit as a separate  button, sending all selected locations to this feature automatically  - basically you select by selecting indiidual loations on multi edit you click generate coordinates button - it send all locations you selected to this function.

&nbsp;