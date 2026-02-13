import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const BbraunEndpointDocs = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <h1 className="text-3xl font-bold mb-2">B. Braun — JSON Data Endpoint Documentation</h1>
        <p className="text-muted-foreground mb-8">Version 1.0 — Last updated: February 2026</p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2">1. Overview</h2>
          <p className="mb-3">
            This document describes the automated JSON data feed that provides B. Braun location data.
            The data is delivered as a single JSON file hosted in a Google Cloud Storage (GCS) bucket.
            Access is granted via email-based Google Cloud IAM permissions.
          </p>
          <table className="w-full border-collapse border border-border text-sm mb-2">
            <tbody>
              <tr className="border-b border-border">
                <td className="font-medium p-3 bg-muted/50 w-1/3">Delivery Method</td>
                <td className="p-3">Google Cloud Storage (GCS) bucket</td>
              </tr>
              <tr className="border-b border-border">
                <td className="font-medium p-3 bg-muted/50">Bucket</td>
                <td className="p-3"><code className="bg-muted px-1.5 py-0.5 rounded text-xs">gs://jasoner/Bbraun Export Copy/</code></td>
              </tr>
              <tr className="border-b border-border">
                <td className="font-medium p-3 bg-muted/50">File Format</td>
                <td className="p-3">JSON (UTF-8 encoded)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="font-medium p-3 bg-muted/50">Authentication</td>
                <td className="p-3">Email-based GCS access (viewer role on the folder)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="font-medium p-3 bg-muted/50">Content-Type</td>
                <td className="p-3"><code className="bg-muted px-1.5 py-0.5 rounded text-xs">application/json</code></td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2">2. Update Principles</h2>
          
          <h3 className="font-semibold mt-4 mb-2">When is the file updated?</h3>
          <p className="mb-3">
            The JSON file is regenerated and re-uploaded <strong>automatically</strong> whenever any B. Braun location
            is created, updated, or deleted in the Jasoner platform. There is no fixed schedule — updates are
            <strong> event-driven and near real-time</strong> (typically within 30 seconds of a change).
          </p>

          <h3 className="font-semibold mt-4 mb-2">How is the file updated?</h3>
          <ul className="list-disc pl-6 space-y-2 mb-3">
            <li>On every data change, the system validates all active locations against the schema rules.</li>
            <li>Only locations passing validation are included in the export.</li>
            <li>The previous file in GCS is <strong>deleted</strong>, then the new file is uploaded fresh (not overwritten in-place).</li>
            <li>The file is always a <strong>complete snapshot</strong> — not a delta/diff. It contains all currently valid, active locations.</li>
          </ul>

          <h3 className="font-semibold mt-4 mb-2">Idempotency</h3>
          <p className="mb-3">
            If no data has changed, the regenerated file will be identical to the previous one. 
            Consumers can safely re-fetch the file at any time without side effects.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2">3. File Structure</h2>
          <p className="mb-3">
            The file contains a top-level JSON array. Each element represents one business location.
          </p>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto mb-3">{`[
  {
    "storeCode": "DE-BRAUN-001",
    "businessName": "B. Braun Melsungen AG",
    "addressLine1": "Carl-Braun-Straße 1",
    "addressLine2": null,
    "addressLine3": null,
    "addressLine4": null,
    "addressLine5": null,
    "postalCode": "34212",
    "city": "Melsungen",
    "state": "Hessen",
    "country": "DE",
    "primaryCategory": "Medical supply store",
    "additionalCategories": null,
    "website": "https://www.bbraun.com",
    "primaryPhone": "+49 5661 71-0",
    "additionalPhones": null,
    "adwords": null,
    "openingDate": null,
    "fromTheBusiness": "Description text...",
    "labels": null,
    "mondayHours": "08:00-17:00",
    "tuesdayHours": "08:00-17:00",
    "wednesdayHours": "08:00-17:00",
    "thursdayHours": "08:00-17:00",
    "fridayHours": "08:00-16:00",
    "saturdayHours": "x",
    "sundayHours": "x",
    "specialHours": null,
    "moreHours": null,
    "temporarilyClosed": false,
    "latitude": 51.1303,
    "longitude": 9.5513,
    "logoPhoto": null,
    "coverPhoto": null,
    "otherPhotos": null,
    "appointmentURL": null,
    "menuURL": null,
    "reservationsURL": null,
    "orderAheadURL": null,
    "customServices": null,
    "socialMediaUrls": null
  }
]`}</pre>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2">4. Field Reference</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-left border border-border">Field</th>
                  <th className="p-2 text-left border border-border">Type</th>
                  <th className="p-2 text-left border border-border">Required</th>
                  <th className="p-2 text-left border border-border">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['storeCode', 'string', 'Yes', 'Unique identifier for the location (max 64 chars)'],
                  ['businessName', 'string', 'Yes', 'Name of the business location (max 300 chars)'],
                  ['addressLine1', 'string', 'Yes', 'Primary address line (max 80 chars)'],
                  ['addressLine2–5', 'string|null', 'No', 'Additional address lines (max 80 chars each)'],
                  ['postalCode', 'string|null', 'No', 'Postal/ZIP code (max 80 chars)'],
                  ['city', 'string|null', 'No', 'City name (max 80 chars)'],
                  ['state', 'string|null', 'No', 'State or region (max 80 chars)'],
                  ['country', 'string', 'Yes', 'ISO 3166-1 alpha-2 country code (e.g. "DE")'],
                  ['primaryCategory', 'string', 'Yes', 'Google Business category'],
                  ['additionalCategories', 'string|null', 'No', 'Comma-separated list (max 10)'],
                  ['website', 'string|null', 'No', 'URL (max 2083 chars)'],
                  ['primaryPhone', 'string|null', 'No', 'Primary phone number'],
                  ['additionalPhones', 'string|null', 'No', 'Comma-separated phone numbers'],
                  ['latitude', 'number|null', 'No', 'Latitude (-90 to 90)'],
                  ['longitude', 'number|null', 'No', 'Longitude (-180 to 180)'],
                  ['mondayHours–sundayHours', 'string|null', 'No', 'Format: "HH:MM-HH:MM" or "x" (closed)'],
                  ['specialHours', 'string|null', 'No', 'Format: "YYYY-MM-DD: HH:MM-HH:MM" or "x"'],
                  ['temporarilyClosed', 'boolean', 'No', 'Whether location is temporarily closed'],
                  ['logoPhoto', 'string|null', 'No', 'URL to logo image'],
                  ['coverPhoto', 'string|null', 'No', 'URL to cover image'],
                  ['otherPhotos', 'string|null', 'No', 'Comma-separated image URLs'],
                  ['fromTheBusiness', 'string|null', 'No', 'Business description (max 750 chars, no URLs)'],
                  ['customServices', 'array|null', 'No', 'Custom service definitions'],
                  ['socialMediaUrls', 'array|null', 'No', 'Social media profile URLs'],
                ].map(([field, type, required, desc], i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-2 border border-border font-mono text-xs">{field}</td>
                    <td className="p-2 border border-border">{type}</td>
                    <td className="p-2 border border-border">{required}</td>
                    <td className="p-2 border border-border">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2">5. Accessing the Data</h2>
          <ol className="list-decimal pl-6 space-y-2 mb-3">
            <li>Request access by providing your Google account email address to the Jasoner team.</li>
            <li>You will receive <strong>Storage Object Viewer</strong> access to the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">gs://jasoner/Bbraun Export Copy/</code> folder.</li>
            <li>
              Fetch the JSON file using any GCS-compatible method:
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Google Cloud Console</strong>: browse and download via the web UI</li>
                <li><strong>gsutil</strong>: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">gsutil cp gs://jasoner/Bbraun\ Export\ Copy/&#123;filename&#125;.json .</code></li>
                <li><strong>GCS JSON API</strong>: authenticated GET request to the objects endpoint</li>
                <li><strong>Client libraries</strong>: Python, Node.js, Java, Go, etc.</li>
              </ul>
            </li>
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2">6. Validation Rules</h2>
          <p className="mb-3">
            Only locations that pass the following validation rules are included in the export:
          </p>
          <ul className="list-disc pl-6 space-y-1 mb-3">
            <li>All required fields (storeCode, businessName, addressLine1, country, primaryCategory) must be present and non-empty.</li>
            <li>Store codes matching the auto-generated pattern (STORE######) are excluded.</li>
            <li>Only locations with <code className="bg-muted px-1.5 py-0.5 rounded text-xs">status: "active"</code> are included.</li>
            <li>URLs must be valid (protocol optional, e.g. <code className="bg-muted px-1.5 py-0.5 rounded text-xs">www.example.com</code> is accepted).</li>
            <li>Phone numbers must contain only digits, spaces, parentheses, +, /, . and dashes.</li>
            <li>Opening hours must follow <code className="bg-muted px-1.5 py-0.5 rounded text-xs">HH:MM-HH:MM</code> format or <code className="bg-muted px-1.5 py-0.5 rounded text-xs">x</code> for closed.</li>
            <li>Business descriptions must not contain URLs and are limited to 750 characters.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2">7. Error Handling & SLA</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Availability</strong>: The file is available 24/7 in GCS with Google's standard SLA (99.95% monthly uptime).</li>
            <li><strong>Data freshness</strong>: Updates propagate within ~30 seconds of a change in the platform.</li>
            <li><strong>File integrity</strong>: If a generation fails, the previous file remains in place until the next successful update.</li>
            <li><strong>Empty exports</strong>: If no locations pass validation, the file will contain an empty array <code className="bg-muted px-1.5 py-0.5 rounded text-xs">[]</code>.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2">8. Rate Limits & Best Practices</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>There are no rate limits on reading the file from GCS.</li>
            <li>We recommend polling no more frequently than every 5 minutes, as updates are event-driven.</li>
            <li>Use <code className="bg-muted px-1.5 py-0.5 rounded text-xs">If-None-Match</code> / ETag headers to avoid downloading unchanged data.</li>
            <li>Always parse the full array — the file is a complete snapshot, not incremental.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2">9. Support</h2>
          <p>
            For access requests, data questions, or technical issues, contact the Jasoner team
            at your designated support channel.
          </p>
        </section>

        <footer className="border-t pt-6 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Jasoner — Confidential</p>
        </footer>
      </div>
    </div>
  );
};

export default BbraunEndpointDocs;
