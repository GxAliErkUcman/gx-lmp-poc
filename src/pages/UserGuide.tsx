import { useState, useEffect, useRef } from 'react';
import jasonerLogo from '@/assets/jasoner-horizontal-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Printer, Search, X } from 'lucide-react';

const Section = ({ number, title, children }: { number: string; title: string; children: React.ReactNode }) => (
  <section className="mb-10 break-inside-avoid-page">
    <h2 className="text-2xl font-bold mb-4 text-primary border-b-2 border-primary/20 pb-2">
      {number}. {title}
    </h2>
    {children}
  </section>
);

const SubSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-6">
    <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
    {children}
  </div>
);

const Tip = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-primary/5 border-l-4 border-primary p-3 rounded-r-lg my-3 text-sm print:bg-gray-50">
    <span className="font-semibold text-primary">💡 Tip: </span>
    {children}
  </div>
);

const StepList = ({ steps }: { steps: string[] }) => (
  <ol className="list-decimal list-inside space-y-2 ml-2 text-sm leading-relaxed">
    {steps.map((step, i) => (
      <li key={i} className="text-foreground">{step}</li>
    ))}
  </ol>
);

const FieldTable = ({ fields }: { fields: { name: string; description: string; required?: boolean }[] }) => (
  <div className="overflow-x-auto my-3">
    <table className="w-full text-sm border border-border rounded-lg">
      <thead>
        <tr className="bg-muted/50">
          <th className="text-left p-2 border-b border-border font-semibold">Field</th>
          <th className="text-left p-2 border-b border-border font-semibold">Description</th>
          <th className="text-center p-2 border-b border-border font-semibold w-20">Required</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((f, i) => (
          <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
            <td className="p-2 border-b border-border font-medium">{f.name}</td>
            <td className="p-2 border-b border-border text-muted-foreground">{f.description}</td>
            <td className="p-2 border-b border-border text-center">{f.required ? '✅' : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const UserGuide = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchQuery || !contentRef.current) {
      // Remove existing highlights
      const existing = contentRef.current?.querySelectorAll('mark[data-search-highlight]');
      existing?.forEach(el => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent || ''), el);
          parent.normalize();
        }
      });
      return;
    }

    // Remove old highlights first
    const existing = contentRef.current.querySelectorAll('mark[data-search-highlight]');
    existing.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });

    // Highlight matches
    const walker = document.createTreeWalker(contentRef.current, NodeFilter.SHOW_TEXT);
    const matches: { node: Text; index: number }[] = [];
    const query = searchQuery.toLowerCase();
    
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const idx = node.textContent?.toLowerCase().indexOf(query) ?? -1;
      if (idx !== -1) {
        matches.push({ node, index: idx });
      }
    }

    if (matches.length > 0) {
      // Highlight first match and scroll to it
      const { node, index } = matches[0];
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + searchQuery.length);
      const mark = document.createElement('mark');
      mark.setAttribute('data-search-highlight', 'true');
      mark.style.backgroundColor = 'hsl(var(--primary) / 0.3)';
      mark.style.padding = '1px 2px';
      mark.style.borderRadius = '2px';
      range.surroundContents(mark);
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Highlight remaining matches
      for (let i = 1; i < matches.length; i++) {
        try {
          const w2 = document.createTreeWalker(contentRef.current, NodeFilter.SHOW_TEXT);
          let count = 0;
          while (w2.nextNode()) {
            const n = w2.currentNode as Text;
            const idx = n.textContent?.toLowerCase().indexOf(query) ?? -1;
            if (idx !== -1) {
              count++;
              if (count > i - 1) {
                const r = document.createRange();
                r.setStart(n, idx);
                r.setEnd(n, idx + searchQuery.length);
                const m = document.createElement('mark');
                m.setAttribute('data-search-highlight', 'true');
                m.style.backgroundColor = 'hsl(var(--primary) / 0.15)';
                m.style.padding = '1px 2px';
                m.style.borderRadius = '2px';
                r.surroundContents(m);
                break;
              }
            }
          }
        } catch {}
      }
    }
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-background font-montserrat">
      {/* Print button - hidden in print */}
      <div className="fixed top-4 right-4 z-50 print:hidden flex gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search guide..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 w-48 h-9 shadow-lg bg-background"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Button onClick={() => window.print()} className="shadow-lg">
          <Printer className="w-4 h-4 mr-2" />
          Save as PDF
        </Button>
        <Button variant="outline" onClick={() => window.history.back()} className="shadow-lg">
          Back
        </Button>
      </div>

      <div ref={contentRef} className="max-w-4xl mx-auto px-6 py-12 print:px-0 print:py-0">
        {/* Cover / Title */}
        <div className="text-center mb-16 print:mb-10 break-after-page">
          <img src={jasonerLogo} alt="Jasoner" className="h-40 mx-auto mb-8" />
          <h1 className="text-4xl font-bold mb-4 text-foreground">Jasoner User Guide</h1>
          <p className="text-xl text-muted-foreground mb-2">The Location Management Platform</p>
          <p className="text-sm text-muted-foreground">A Step by Step Guide on how to manage your locations</p>
          <div className="mt-8 text-xs text-muted-foreground">
            Version 1.0 • {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </div>
        </div>

        {/* Table of Contents */}
        <Section number="0" title="Table of Contents">
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Logging In & Navigation</li>
            <li>Dashboard Overview</li>
            <li>Understanding Tabs: Active vs. Need Attention</li>
            <li>Viewing Your Locations (Table & Grid Views)</li>
            <li>Searching & Filtering Locations</li>
            <li>Adding a New Location</li>
            <li>Editing a Location</li>
            <li>Location Fields Reference</li>
            <li>Opening Hours</li>
            <li>Special Hours</li>
            <li>Photos & Media</li>
            <li>Social Media Links</li>
            <li>Custom Services</li>
            <li>Multi-Edit: Editing Multiple Locations at Once</li>
            <li>Importing Locations from Excel</li>
            <li>Exporting Locations</li>
            <li>Account Settings</li>
            <li>User Settings (Theme, Language, Password)</li>
            <li>Validation & Error Resolution</li>
            <li>Deleting Locations</li>
            <li>Tips & Best Practices</li>
          </ol>
        </Section>

        {/* 1. Logging In */}
        <Section number="1" title="Logging In & Navigation">
          <p className="text-sm text-muted-foreground mb-3">
            Open Jasoner in your web browser. You will be presented with a login screen.
          </p>
          <StepList steps={[
            'Enter your email address and password provided by your administrator.',
            'Click "Sign In" to access your dashboard.',
            'If you forgot your password, click "Forgot Password" to receive a reset link via email.',
            'After logging in, you are automatically redirected to your Dashboard.',
          ]} />
          <Tip>Your administrator will create your account and send you login credentials. You cannot register yourself.</Tip>
        </Section>

        {/* 2. Dashboard Overview */}
        <Section number="2" title="Dashboard Overview">
          <p className="text-sm text-muted-foreground mb-3">
            The Dashboard is your home screen. It displays all the business locations assigned to you.
          </p>
          <SubSection title="Header Bar">
            <p className="text-sm text-muted-foreground">
              The top bar shows the <strong>Jasoner logo</strong>, your <strong>email address</strong>, your <strong>company logo</strong> (if uploaded), 
              a <strong>User Settings</strong> button (gear icon), and a <strong>Sign Out</strong> button.
            </p>
          </SubSection>
          <SubSection title="Action Buttons">
            <p className="text-sm text-muted-foreground mb-2">Below the header, you'll find:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
              <li><strong>View toggle</strong> — Switch between Grid and Table view</li>
              <li><strong>Account Settings</strong> — Manage logos, social media, opening hours, service URLs, and custom services for all locations</li>
              <li><strong>Import</strong> — Upload locations from Excel files</li>
              <li><strong>Export</strong> — Download locations as JSON or Excel</li>
              <li><strong>Add</strong> — Create a new location manually</li>
            </ul>
          </SubSection>
          <SubSection title="Location Count">
            <p className="text-sm text-muted-foreground">
              A summary line shows how many locations are <strong>Active</strong> and how many <strong>Need Attention</strong>.
            </p>
          </SubSection>
        </Section>

        {/* 3. Tabs */}
        <Section number="3" title="Understanding Tabs: Active vs. Need Attention">
          <SubSection title="Active Locations">
            <p className="text-sm text-muted-foreground">
              These are fully validated locations that are ready for publishing. They have all required fields filled and pass validation checks.
              Active locations will be sent to g-Xperts for publishing on Google Business Profile.
            </p>
          </SubSection>
          <SubSection title="Need Attention">
            <p className="text-sm text-muted-foreground">
              Locations here are either in <strong>Pending</strong> status or have validation errors despite being marked Active.
              They will <strong>not</strong> be published until all issues are resolved. Each location shows a red exclamation icon (⚠️) 
              that you can click to see exactly what needs to be fixed.
            </p>
          </SubSection>
          <Tip>Focus on resolving all "Need Attention" items first to ensure all your locations get published.</Tip>
        </Section>

        {/* 4. Viewing */}
        <Section number="4" title="Viewing Your Locations (Table & Grid Views)">
          <SubSection title="Table View (Default)">
            <p className="text-sm text-muted-foreground">
              Shows locations in a spreadsheet-like table with sortable columns. Each row displays key information 
              (Store Code, Business Name, Category, Address, City, Country, Postal Code) and action buttons to Edit or Delete.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              You can <strong>click any column header</strong> to sort ascending/descending.
            </p>
          </SubSection>
          <SubSection title="Grid View">
            <p className="text-sm text-muted-foreground">
              Shows locations as individual cards in a responsive grid. Each card displays the business name, 
              category badge, address, and Edit/Delete buttons. Useful for a quick visual overview.
            </p>
          </SubSection>
          <SubSection title="Manage View (Columns)">
            <p className="text-sm text-muted-foreground">
              In Table view, click the <strong>"Manage View"</strong> button (gear icon) to show/hide columns. 
              You can toggle visibility for: Phone, Website, Labels, Goldmine, and more. 
              Store Code and Business Name are always visible.
            </p>
          </SubSection>
        </Section>

        {/* 5. Searching & Filtering */}
        <Section number="5" title="Searching & Filtering Locations">
          <SubSection title="Search">
            <p className="text-sm text-muted-foreground">
              Use the search bar at the top of the table to quickly find locations. Search works across: 
              Business Name, City, Category, Store Code, Address, and Postal Code.
            </p>
          </SubSection>
          <SubSection title="Filters">
            <p className="text-sm text-muted-foreground mb-2">
              Click the <strong>"Filters"</strong> button to reveal filter dropdowns:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
              <li><strong>Category</strong> — Filter by business category</li>
              <li><strong>City</strong> — Filter by city</li>
              <li><strong>Country</strong> — Filter by country</li>
              <li><strong>Postal Code</strong> — Filter by postal code</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Active filters show a badge count. Click <strong>"Clear Filters"</strong> to reset all.
            </p>
          </SubSection>
        </Section>

        {/* 6. Adding a New Location */}
        <Section number="6" title="Adding a New Location">
          <StepList steps={[
            'Click the "Add" button (+ icon) in the action bar.',
            'A dialog opens with a form divided into sections.',
            'Fill in the required fields: Business Name, Street Address, Country, and Primary Category.',
            'The Store Code is automatically generated from the business name (you can change it).',
            'Fill in additional optional fields as needed (see Section 8 for all fields).',
            'Set Opening Hours for each day of the week.',
            'Upload a Cover Photo if desired.',
            'Click "Create Business" to save. The location will appear in your list.',
          ]} />
          <Tip>New locations start as "Pending" until all required fields pass validation, then they move to "Active".</Tip>
        </Section>

        {/* 7. Editing a Location */}
        <Section number="7" title="Editing a Location">
          <StepList steps={[
            'Find the location you want to edit in the table or grid.',
            'Click the "Edit" button (pencil icon) on that location\'s row or card.',
            'The edit dialog opens, pre-filled with all existing data.',
            'Make your changes. The form will warn you if you\'re deleting existing data from fields.',
            'If you change the Business Name or Primary Category, a confirmation dialog will appear since these are critical fields.',
            'Click "Update Business" to save your changes.',
          ]} />
          <Tip>Some fields may be locked by your administrator and appear grayed out. You cannot modify locked fields.</Tip>
        </Section>

        {/* 8. Field Reference */}
        <Section number="8" title="Location Fields Reference">
          <SubSection title="Basic Information">
            <FieldTable fields={[
              { name: 'Store Code', description: 'Unique identifier for this location in your system. Auto-generated but editable.', required: true },
              { name: 'Business Name', description: 'The official name of the business location.', required: true },
              { name: 'Primary Category', description: 'Main business category (e.g., "Restaurant", "Gas Station"). Selected from a predefined list.', required: true },
              { name: 'Additional Categories', description: 'Extra categories, comma-separated.' },
              { name: 'Labels', description: 'Internal tags for organizing locations.' },
            ]} />
          </SubSection>
          <SubSection title="Address">
            <FieldTable fields={[
              { name: 'Street Address (Line 1)', description: 'Primary street address.', required: true },
              { name: 'Address Lines 2-5', description: 'Additional address details (suite, floor, etc.).' },
              { name: 'City', description: 'City or town name.' },
              { name: 'State/Province', description: 'State, province, or region.' },
              { name: 'Postal Code', description: 'ZIP or postal code.' },
              { name: 'District', description: 'District or neighborhood.' },
              { name: 'Country', description: 'Country where the business is located.', required: true },
            ]} />
          </SubSection>
          <SubSection title="Location Coordinates">
            <FieldTable fields={[
              { name: 'Latitude', description: 'GPS latitude. Enter manually or use the buttons below to auto-detect.' },
              { name: 'Longitude', description: 'GPS longitude. Enter manually or use the buttons below to auto-detect.' },
            ]} />
            <p className="text-sm text-muted-foreground mt-2 mb-1">Two options are available to set coordinates automatically:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
              <li><strong>Use Current Location</strong> — Uses your browser's GPS to detect your current latitude and longitude.</li>
              <li><strong>Find from Address</strong> — Geocodes the address fields you've already filled in (Street, City, Country) to find the coordinates automatically.</li>
            </ul>
            <Tip>You can also type latitude and longitude values directly into the input fields if you already know them.</Tip>
          </SubSection>
          <SubSection title="Contact & Web">
            <FieldTable fields={[
              { name: 'Primary Phone', description: 'Main phone number for the location.' },
              { name: 'Additional Phones', description: 'Other phone numbers.' },
              { name: 'Website', description: 'Website URL.' },
              { name: 'AdWords', description: 'Google Ads tracking identifier.' },
            ]} />
          </SubSection>
          <SubSection title="Business Details">
            <FieldTable fields={[
              { name: 'Opening Date', description: 'When the business opened. Cannot be a future date.' },
              { name: 'From the Business', description: 'A description shown on Google Business Profile. No URLs allowed.' },
              { name: 'Temporarily Closed', description: 'Toggle to mark a location as temporarily closed.' },
              { name: 'Goldmine', description: 'Internal notes field. Not included in any exports or published data.' },
            ]} />
          </SubSection>
          <SubSection title="Service URLs">
            <FieldTable fields={[
              { name: 'Appointment URL', description: 'Link for booking appointments.' },
              { name: 'Menu URL', description: 'Link to the menu.' },
              { name: 'Reservations URL', description: 'Link for making reservations.' },
              { name: 'Order Ahead URL', description: 'Link for online ordering.' },
            ]} />
          </SubSection>
        </Section>

        {/* 9. Opening Hours */}
        <Section number="9" title="Opening Hours">
          <p className="text-sm text-muted-foreground mb-3">
            Each day of the week has its own hours field. You can set hours per location in the edit dialog using a structured time picker.
          </p>
          <SubSection title="How It Works">
            <p className="text-sm text-muted-foreground mb-2">
              For each day, you'll see an <strong>"Opens at"</strong> and <strong>"Closes at"</strong> time selector to define when the store is open.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
              <li>Select the opening time in the first dropdown and the closing time in the second.</li>
              <li>If the store has a <strong>break</strong> (e.g., closed during lunch), click <strong>"Add period"</strong> to add a second time range for the same day.</li>
              <li>You can add as many periods as needed (e.g., morning shift + afternoon shift).</li>
              <li>Remove a period by clicking the delete (trash) icon next to it.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Example: A store open 09:00–12:00 and 14:00–18:00 would have two periods for that day.
            </p>
          </SubSection>
          <SubSection title="Closed Days">
            <p className="text-sm text-muted-foreground">
              Toggle the switch next to a day to mark it as closed. Closed days will appear as "Closed" in the listing.
            </p>
          </SubSection>
          <SubSection title="Bulk Opening Hours (Account Settings)">
            <p className="text-sm text-muted-foreground">
              Go to <strong>Account Settings → Opening Hours</strong> to set hours for <strong>all locations at once</strong>. 
              This is useful when all your locations share the same schedule.
            </p>
          </SubSection>
        </Section>

        {/* 10. Special Hours */}
        <Section number="10" title="Special Hours">
          <p className="text-sm text-muted-foreground mb-3">
            Special Hours are for holidays or exceptional dates when hours differ from regular schedule.
          </p>
          <StepList steps={[
            'In the location edit dialog, scroll to the "Special Hours" section.',
            'Click "Add Special Hours" to add a new entry.',
            'Select a date and enter the hours for that date, or mark it as closed.',
            'You can add multiple special hour entries.',
            'Remove an entry by clicking the delete (trash) icon.',
          ]} />
        </Section>

        {/* 11. Photos */}
        <Section number="11" title="Photos & Media">
          <SubSection title="Cover Photo">
            <p className="text-sm text-muted-foreground">
              In the edit dialog, scroll to the Photos section. You can upload a cover photo by clicking the upload area or 
              dragging and dropping an image. Supported formats: JPG, PNG.
            </p>
          </SubSection>
          <SubSection title="Logo Photo">
            <p className="text-sm text-muted-foreground">
              The company logo is managed at the account level via <strong>Account Settings → Account Logo</strong>. 
              It applies to all your locations.
            </p>
          </SubSection>
          <SubSection title="Other Photos">
            <p className="text-sm text-muted-foreground">
              Additional photos can be entered as comma-separated URLs in the "Other Photos" field.
            </p>
          </SubSection>
        </Section>

        {/* 12. Social Media */}
        <Section number="12" title="Social Media Links">
          <p className="text-sm text-muted-foreground mb-3">
            Social media URLs can be set individually per location or for all locations at once.
          </p>
          <SubSection title="Per Location">
            <p className="text-sm text-muted-foreground">
              In the edit dialog, scroll to the Social Media section. Enter URLs for: Facebook, Instagram, LinkedIn, 
              Pinterest, TikTok, Twitter/X, and YouTube.
            </p>
          </SubSection>
          <SubSection title="Account-Wide (All Locations)">
            <p className="text-sm text-muted-foreground">
              Go to <strong>Account Settings → Social Media Links</strong> to set the same social media URLs across all locations.
            </p>
          </SubSection>
        </Section>

        {/* 13. Custom Services */}
        <Section number="13" title="Custom Services">
          <p className="text-sm text-muted-foreground mb-3">
            Custom services are predefined service offerings that can be assigned to individual locations.
          </p>
          <StepList steps={[
            'Go to Account Settings → Custom Services to define your available services.',
            'Create services with a name and optional description.',
            'When editing a location, click "Manage Services" to assign services to that location.',
            'Toggle services on/off per location.',
          ]} />
        </Section>

        {/* 14. Multi-Edit */}
        <Section number="14" title="Multi-Edit: Editing Multiple Locations at Once">
          <p className="text-sm text-muted-foreground mb-3">
            The multi-edit feature allows you to update the same field across multiple locations simultaneously.
          </p>
          <StepList steps={[
            'In Table view, use the checkboxes on the left to select multiple locations.',
            'A toolbar appears showing the number of selected items with "Edit" and "Delete" buttons.',
            'Click "Edit" to open the Multi-Edit dialog.',
            'Only fill in the fields you want to change — empty fields will be left unchanged.',
            'Available fields include: Business Name, Phone, Website, Description, Category, Country, Opening Hours, Social Media, and more.',
            'Click "Apply Changes" to update all selected locations.',
          ]} />
          <Tip>Multi-edit only changes fields you actively fill in. Blank fields in the multi-edit form are ignored.</Tip>
          <Tip>Combine Multi-Edit with the filter functionality for powerful bulk updates. For example, filter by a specific city, country, or category first, then select all filtered results and multi-edit — this lets you make city-wide, country-wide, or industry-wide changes in seconds.</Tip>
        </Section>

        {/* 15. Import */}
        <Section number="15" title="Importing Locations from Excel">
          <p className="text-sm text-muted-foreground mb-3">
            You can bulk-create or update locations by uploading an Excel (.xlsx) or CSV file.
          </p>
          <SubSection title="Preparing Your File">
            <p className="text-sm text-muted-foreground mb-2">
              If your data is in <strong>Google Sheets</strong>, go to <strong>File → Download → Microsoft Excel (.xlsx)</strong> to save it as an Excel file first.
            </p>
            <p className="text-sm text-muted-foreground">
              If your data is already in <strong>Excel</strong>, simply save your file as <code className="bg-muted px-1 py-0.5 rounded text-xs">.xlsx</code> or <code className="bg-muted px-1 py-0.5 rounded text-xs">.csv</code>. 
              Make sure your data has column headers in the first row (e.g., "Store Code", "Business Name", "Address", etc.).
            </p>
          </SubSection>
          <SubSection title="Import Steps">
          <StepList steps={[
            'Click the "Import" button (upload icon) in the action bar.',
            'Drag and drop your file, or click to browse.',
            'Jasoner reads your columns and asks you to map them to location fields.',
            'Required columns: Store Code, Business Name, Address Line 1, Country, Primary Category.',
            'Review the mapping. Jasoner highlights issues with yellow/red badges.',
            'If duplicate Store Codes are found, you\'ll be asked how to handle them (update existing or skip).',
            'Click "Import" to process the data.',
            'A summary shows how many locations were created or updated.',
          ]} />
          <Tip>Use the same Store Codes as existing locations to update them instead of creating duplicates.</Tip>
          </SubSection>
        </Section>

        {/* 16. Export */}
        <Section number="16" title="Exporting Locations">
          <p className="text-sm text-muted-foreground mb-3">
            Jasoner supports exporting your locations in multiple formats.
          </p>
          <SubSection title="Export Options">
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
              <li><strong>JSON</strong> — Standard format for publishing via g-Xperts. Only validated, active locations are included.</li>
              <li><strong>Excel (.xlsx)</strong> — Full spreadsheet export of all locations.</li>
              <li><strong>CSV</strong> — Comma-separated values format.</li>
            </ul>
          </SubSection>
          <SubSection title="Validation Before Export">
            <p className="text-sm text-muted-foreground">
              Before exporting JSON, Jasoner validates all active locations. If any location has errors, it will be flagged.
              You can click on flagged locations to fix them before re-exporting.
            </p>
          </SubSection>
          <Tip>Out-of-sync locations (marked with a sync warning) are automatically excluded from JSON exports.</Tip>
        </Section>

        {/* 17. Account Settings */}
        <Section number="17" title="Account Settings">
          <p className="text-sm text-muted-foreground mb-3">
            Access Account Settings from the gear icon on the dashboard. These settings apply to <strong>all</strong> your locations.
          </p>
          <SubSection title="Available Settings">
            <FieldTable fields={[
              { name: 'Service URLs', description: 'Set appointment, menu, reservation, and order-ahead URLs for all locations.' },
              { name: 'Custom Services', description: 'Define services that can be assigned to individual locations.' },
              { name: 'Social Media Links', description: 'Set social media URLs applied across all locations.' },
              { name: 'Account Logo', description: 'Upload your company logo displayed in the header and listings.' },
              { name: 'Opening Hours', description: 'Set uniform opening hours for all locations at once.' },
            ]} />
          </SubSection>
          <Tip>Some of these settings may be locked by your administrator. Locked settings appear grayed out.</Tip>
        </Section>

        {/* 18. User Settings */}
        <Section number="18" title="User Settings (Theme, Language, Password)">
          <p className="text-sm text-muted-foreground mb-3">
            Click the gear icon next to your email in the header to open User Settings.
          </p>
          <SubSection title="Theme">
            <p className="text-sm text-muted-foreground">
              Choose between <strong>Light</strong>, <strong>Dark</strong>, or <strong>System</strong> theme. 
              The interface adapts immediately.
            </p>
          </SubSection>
          <SubSection title="Language">
            <p className="text-sm text-muted-foreground">
              Select your preferred language from the dropdown. Available languages include: 
              English, German, Turkish, Spanish, French, Italian, Serbian, Romanian, and any custom languages added by your administrator.
            </p>
          </SubSection>
          <SubSection title="Change Password">
            <p className="text-sm text-muted-foreground">
              Click "Change Password" to set a new password. Minimum 8 characters required. 
              You'll need to enter the new password twice for confirmation.
            </p>
          </SubSection>
        </Section>

        {/* 19. Validation */}
        <Section number="19" title="Validation & Error Resolution">
          <p className="text-sm text-muted-foreground mb-3">
            Jasoner continuously validates your locations to ensure data quality for publishing.
          </p>
          <SubSection title="Common Validation Errors">
            <FieldTable fields={[
              { name: 'Missing Store Code', description: 'Every location needs a unique store code.' },
              { name: 'Missing Business Name', description: 'The business name field cannot be empty.' },
              { name: 'Missing Address', description: 'A street address (Address Line 1) is required.' },
              { name: 'Missing Country', description: 'A country must be selected.' },
              { name: 'Missing Category', description: 'A primary category must be chosen.' },
              { name: 'URL in Description', description: 'The "From the Business" description must not contain URLs.' },
              { name: 'Auto-generated Store Code', description: 'Replace "STORE###" codes with meaningful identifiers.' },
            ]} />
          </SubSection>
          <SubSection title="How to Fix">
            <StepList steps={[
              'Go to the "Need Attention" tab to see all locations with issues.',
              'Click the red exclamation icon (⚠️) next to a location to see the specific error.',
              'Each error includes a "How to fix" instruction.',
              'Click "Edit" to open the location and make the necessary corrections.',
              'Save the location. If all issues are resolved, it moves to the "Active" tab.',
            ]} />
          </SubSection>
        </Section>

        {/* 20. Deleting */}
        <Section number="20" title="Deleting Locations">
          <SubSection title="Single Location">
            <p className="text-sm text-muted-foreground">
              Click the "Delete" button (trash icon) on a location's row or card. A confirmation dialog will appear. 
              This action <strong>cannot be undone</strong>.
            </p>
          </SubSection>
          <SubSection title="Multiple Locations">
            <p className="text-sm text-muted-foreground">
              In Table view, select multiple locations using checkboxes, then click the "Delete" button in the selection toolbar.
              A confirmation dialog shows how many locations will be deleted.
            </p>
          </SubSection>
        </Section>

        {/* 21. Tips */}
        <Section number="21" title="Tips & Best Practices">
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-2">
            <li><strong>Keep Store Codes meaningful</strong> — Use codes that your team recognizes (e.g., city abbreviations or internal IDs).</li>
            <li><strong>Check "Need Attention" regularly</strong> — Resolve validation issues promptly to ensure timely publishing.</li>
            <li><strong>Use Account Settings for shared data</strong> — Set opening hours, social media, and service URLs at the account level when they're the same across locations.</li>
            <li><strong>Use Multi-Edit for bulk changes</strong> — Instead of editing locations one by one, select multiple and apply changes at once.</li>
            <li><strong>Use Import for large updates</strong> — When updating many fields across many locations, export to Excel, make changes, and re-import using matching Store Codes.</li>
            <li><strong>Goldmine is private</strong> — Use the Goldmine field for internal notes. It is never exported or published.</li>
            <li><strong>Set coordinates easily</strong> — In the edit dialog, use "Find from Address" to auto-detect GPS coordinates from your address fields, or "Use Current Location" if you're physically at the store. You can also type latitude and longitude manually.</li>
            <li><strong>Description guidelines</strong> — The "From the Business" description should not contain URLs, phone numbers, or promotional offers per Google guidelines.</li>
            <li><strong>Google-optimized categories</strong> — Jasoner checks your data for suitability against Google Business Profile guidelines to optimize your listing. Categories are curated and pre-selected to best match your business type. If you have a new type of business among your locations that isn't covered by the available categories, contact your administrator to have it added.</li>
          </ul>
        </Section>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground mt-16 pt-8 border-t border-border print:mt-8">
          <p>Jasoner User Guide • Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p className="mt-1">© {new Date().getFullYear()} Jasoner — All rights reserved.</p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .break-after-page { page-break-after: always; }
          .break-inside-avoid-page { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
};

export default UserGuide;
