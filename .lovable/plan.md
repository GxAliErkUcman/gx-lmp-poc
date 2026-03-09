

## Analysis: Current Sync State

I compared every client's **last database change** against the **last export timestamp** in Supabase storage. The Supabase storage exports are all current -- each export timestamp matches or is newer than the last business update.

**The risk is on the GCP side.** The `generate-json-export` function auto-syncs to GCP, but historically this sync may have failed silently (timeouts, errors) for some clients, and with triggers not firing on CRUD ops, the only exports that reached GCP were from manual exports or scheduled backups. There is no way for me to directly read the GCP bucket contents to verify.

## Proposed Plan

**Re-export all active clients to ensure GCP is fully in sync:**

Invoke the `generate-json-export` edge function for each of the 19 clients that have businesses. This will:
1. Regenerate the JSON from the current database state
2. Upload to Supabase storage (upsert)
3. Auto-sync each file to GCP

The clients to refresh (in order):
- admin Client, B Braun, Bachner, Cinnamood, DHL Supply Chain, DPD South Africa, Energie 360°, Erk Enterprises, Fischer-Bike, Gigatron, JTI, Lufthansa Group, Mediamarkt, Porsche, Porsche Test, Ströck, SW Schwäbisch Hall, Swedavia, Zurich

This is a non-destructive operation -- it just regenerates exports from the current database and pushes to GCP.

## Prevention

The triggers are now re-attached (via the migration from earlier), so going forward every INSERT/UPDATE/DELETE on `businesses` will automatically trigger an export + GCP sync. No further code changes are needed.

