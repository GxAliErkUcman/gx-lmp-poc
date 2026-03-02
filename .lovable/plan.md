

## Plan: Custom Photos Feature (GCP Bucket + Location Gallery)

### Overview

Add custom photo uploads per location stored in GCP bucket `jasoner/Custom Photos/{clientName}/{storeCode}/`, plus a unified gallery dialog showing logo, cover, and custom photos.

### New Files

**1. `supabase/functions/manage-custom-photos/index.ts`** — Edge function handling 3 actions:
- **upload**: Receives base64 image + metadata, validates, uploads to `gs://jasoner/Custom Photos/{clientName}/{storeCode}/{timestamp}-{random}.{ext}`
- **list**: Lists all objects in `gs://jasoner/Custom Photos/{clientName}/{storeCode}/` and returns their public URLs
- **delete**: Deletes a specific object from the GCP bucket

Uses the existing `SERVICE_ACCOUNT_KEY` secret and the same `getGcpAccessToken` pattern from `sync-to-gcp`. Returns `{ success: true/false }` pattern per project convention.

**2. `src/components/CustomPhotoUpload.tsx`** — Drag-and-drop + select component (similar to `PhotoUpload.tsx`):
- Uses `react-dropzone` for drag & drop
- Validates with `validateCoverPhoto` rules (same as cover: JPG/PNG/TIFF/BMP, 10KB min, 480x270 to 2120x1192)
- Max 10 photos per location
- Converts files to base64 and calls the edge function for upload
- Displays uploaded photos in a grid with delete buttons
- Props: `storeCode`, `clientName`, `disabled`

**3. `src/components/LocationGalleryDialog.tsx`** — Gallery dialog showing all photos:
- Three tabs/sections: Logo, Cover Photo, Custom Photos
- Displays existing logo and cover from business record (read from Supabase)
- Fetches custom photos from GCP via the edge function's `list` action
- Allows uploading new photos to each category (logo/cover use existing `PhotoUpload`, custom uses new `CustomPhotoUpload`)
- Delete capability for custom photos

### Modified Files

**4. `src/components/BusinessDialog.tsx`** — Add after the Logo Photo Upload card (~line 1061):
- New "Custom Photos" card section with `CustomPhotoUpload` component
- Pass `storeCode` and `clientName` from the business being edited
- Only show when editing (not creating new), since storeCode is needed

**5. `src/pages/Dashboard.tsx`** / `src/pages/ClientDashboard.tsx` / `src/pages/StoreOwnerDashboard.tsx`** — Add a "Gallery" button (camera icon) in the business table/grid row actions that opens `LocationGalleryDialog` for that location.

**6. `supabase/config.toml`** — Add `[functions.manage-custom-photos]` with `verify_jwt = false`.

### Technical Details

- **GCP Auth**: Reuses the `getGcpAccessToken()` helper from `sync-to-gcp` (JWT-based service account auth)
- **GCP API**: Uses Google Cloud Storage JSON API for upload (`POST /upload/storage/v1/b/jasoner/o`), list (`GET /storage/v1/b/jasoner/o?prefix=Custom%20Photos/...`), and delete (`DELETE /storage/v1/b/jasoner/o/{object}`)
- **Public URLs**: Photos served via `https://storage.googleapis.com/jasoner/Custom%20Photos/{clientName}/{storeCode}/{filename}`
- **Auth**: Edge function validates Supabase JWT from the `Authorization` header to ensure the user is authenticated
- **No database changes**: Custom photos are GCP-only, no new tables or columns needed

