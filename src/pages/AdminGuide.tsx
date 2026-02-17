import { useState, useEffect, useRef } from 'react';
import jasonerLogo from '@/assets/jasoner-horizontal-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Printer, Search, X, ChevronUp } from 'lucide-react';

const Section = ({ id, number, title, children }: { id?: string; number: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="mb-10 break-inside-avoid-page">
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

const SubSubSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-4 ml-2">
    <h4 className="text-base font-semibold mb-1.5 text-foreground/90">{title}</h4>
    {children}
  </div>
);

const Tip = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-primary/5 border-l-4 border-primary p-3 rounded-r-lg my-3 text-sm print:bg-gray-50">
    <span className="font-semibold text-primary">💡 Tip: </span>
    {children}
  </div>
);

const Warning = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-destructive/5 border-l-4 border-destructive p-3 rounded-r-lg my-3 text-sm print:bg-red-50">
    <span className="font-semibold text-destructive">⚠️ Warning: </span>
    {children}
  </div>
);

const Info = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-blue-500/5 border-l-4 border-blue-500 p-3 rounded-r-lg my-3 text-sm print:bg-blue-50">
    <span className="font-semibold text-blue-600">ℹ️ Note: </span>
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

const BulletList = ({ items }: { items: string[] }) => (
  <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-muted-foreground">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);

const FieldTable = ({ fields }: { fields: { name: string; description: string; required?: boolean }[] }) => (
  <div className="overflow-x-auto my-3">
    <table className="w-full text-sm border border-border rounded-lg">
      <thead>
        <tr className="bg-muted/50">
          <th className="text-left p-2 border-b border-border font-semibold">Field / Feature</th>
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

const RoleTable = ({ roles }: { roles: { role: string; description: string; capabilities: string[] }[] }) => (
  <div className="overflow-x-auto my-3">
    <table className="w-full text-sm border border-border rounded-lg">
      <thead>
        <tr className="bg-muted/50">
          <th className="text-left p-2 border-b border-border font-semibold w-36">Role</th>
          <th className="text-left p-2 border-b border-border font-semibold">Description</th>
          <th className="text-left p-2 border-b border-border font-semibold">Key Capabilities</th>
        </tr>
      </thead>
      <tbody>
        {roles.map((r, i) => (
          <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
            <td className="p-2 border-b border-border font-medium">{r.role}</td>
            <td className="p-2 border-b border-border text-muted-foreground">{r.description}</td>
            <td className="p-2 border-b border-border text-muted-foreground">
              <ul className="list-disc list-inside space-y-0.5">
                {r.capabilities.map((c, j) => <li key={j}>{c}</li>)}
              </ul>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const AdminGuide = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchQuery || !contentRef.current) {
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

    const existing = contentRef.current.querySelectorAll('mark[data-search-highlight]');
    existing.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });

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

      for (let i = 1; i < Math.min(matches.length, 50); i++) {
        try {
          const w2 = document.createTreeWalker(contentRef.current, NodeFilter.SHOW_TEXT);
          let count = 0;
          while (w2.nextNode()) {
            const n = w2.currentNode as Text;
            const idx2 = n.textContent?.toLowerCase().indexOf(query) ?? -1;
            if (idx2 !== -1) {
              count++;
              if (count > i - 1) {
                const r = document.createRange();
                r.setStart(n, idx2);
                r.setEnd(n, idx2 + searchQuery.length);
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

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const tocItems = [
    'Role-Based Access Control (RBAC)',
    'Platform Architecture Overview',
    'Client Management',
    'User Onboarding & Creation',
    'User Offboarding & Deletion',
    'User Management Operations',
    'Location (Business) Data Model',
    'Location Lifecycle & Status',
    'Validation Layers',
    'Import System',
    'Export System',
    'Backup & Version History',
    'Field-Level Access Control (Permissions)',
    'Custom Services Management',
    'Edge Functions Reference',
    'Database Triggers & Automations',
    'Storage Buckets',
    'Authentication & Security',
    'Integrations',
    'Troubleshooting & FAQ',
  ];

  return (
    <div className="min-h-screen bg-background font-montserrat">
      {/* Toolbar */}
      <div className="fixed top-4 right-4 z-50 print:hidden flex gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search docs..."
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

      {/* Scroll-to-top */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 z-50 print:hidden bg-primary text-primary-foreground rounded-full p-2.5 shadow-lg hover:opacity-90 transition-opacity"
      >
        <ChevronUp className="w-5 h-5" />
      </button>

      <div ref={contentRef} className="max-w-4xl mx-auto px-6 py-12 print:px-0 print:py-0">
        {/* Cover */}
        <div className="text-center mb-16 print:mb-10 break-after-page">
          <img src={jasonerLogo} alt="Jasoner" className="h-40 mx-auto mb-8" />
          <h1 className="text-4xl font-bold mb-4 text-foreground">Jasoner Admin & Service User Guide</h1>
          <p className="text-xl text-muted-foreground mb-2">Platform Administration Documentation</p>
          <p className="text-sm text-muted-foreground">Comprehensive reference for Admins and Service Users</p>
          <div className="mt-8 text-xs text-muted-foreground">
            Version 2.0 • {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </div>
        </div>

        {/* Table of Contents */}
        <Section number="0" title="Table of Contents">
          <ol className="list-decimal list-inside space-y-1 text-sm">
            {tocItems.map((item, i) => (
              <li key={i} className="hover:text-primary cursor-pointer" onClick={() => {
                document.getElementById(`section-${i + 1}`)?.scrollIntoView({ behavior: 'smooth' });
              }}>{item}</li>
            ))}
          </ol>
        </Section>

        {/* 1. RBAC */}
        <Section id="section-1" number="1" title="Role-Based Access Control (RBAC)">
          <p className="text-sm text-muted-foreground mb-3">
            Jasoner uses a strict role-based access model. Roles are stored in a dedicated <code className="bg-muted px-1 rounded">user_roles</code> table (never in profiles) to prevent privilege escalation. Every user has exactly one role.
          </p>
          <RoleTable roles={[
            {
              role: 'Admin',
              description: 'Full platform control. Can manage all clients, users, locations, and system settings.',
              capabilities: [
                'Create, edit, delete any client',
                'Create users with any role (including admin)',
                'Set passwords directly during user creation',
                'Manage all locations across all clients',
                'Configure field permissions for any client',
                'Trigger GCP syncs and manual exports',
                'Access the Admin Panel (/admin)',
                'Manage translations',
              ],
            },
            {
              role: 'Service User',
              description: 'Multi-client operator. Can manage locations and users for assigned clients only.',
              capabilities: [
                'View and manage locations for assigned clients',
                'Create users (user, store_owner, client_admin roles) within assigned clients',
                'Access Client Dashboard for each assigned client',
                'Configure field permissions and custom services',
                'Import/export locations',
                'Access Service User Home (/service-user-home)',
              ],
            },
            {
              role: 'Client Admin',
              description: 'Client-level administrator. Manages locations and users within their own client.',
              capabilities: [
                'Create users (user, store_owner roles) within their client',
                'Manage field permissions (can lock fields for users and store owners)',
                'Manage custom services, categories, and account settings',
                'Import/export locations for their client',
                'Access Client Admin Panel (/client-admin)',
              ],
            },
            {
              role: 'User',
              description: 'Standard user. Can manage locations within their client.',
              capabilities: [
                'View, add, edit, delete locations in their client',
                'Import/export locations',
                'Cannot manage other users or permissions',
              ],
            },
            {
              role: 'Store Owner',
              description: 'Limited access. Can only manage specifically assigned locations.',
              capabilities: [
                'View and edit only their assigned stores',
                'Cannot add or delete locations',
                'Cannot import/export',
                'Cannot manage other users',
              ],
            },
          ]} />
          <Info>Role hierarchy for user creation: Admins can create any role. Service Users can create user, store_owner, and client_admin. Client Admins can only create user and store_owner roles.</Info>
        </Section>

        {/* 2. Platform Architecture */}
        <Section id="section-2" number="2" title="Platform Architecture Overview">
          <SubSection title="Technology Stack">
            <BulletList items={[
              'Frontend: React + TypeScript + Vite + Tailwind CSS + shadcn/ui',
              'Backend: Supabase (PostgreSQL, Auth, Edge Functions, Storage)',
              'State Management: TanStack React Query',
              'Internationalization: i18next (EN, DE, NL, FR)',
              'Export formats: JSON, CSV, XLS (Google Business Profile schema)',
            ]} />
          </SubSection>
          <SubSection title="Key Routes">
            <FieldTable fields={[
              { name: '/', description: 'Landing page / redirect based on role' },
              { name: '/auth', description: 'Login page' },
              { name: '/admin', description: 'Admin Panel — client & user management (admin only)' },
              { name: '/service-user-home', description: 'Service User landing — lists assigned clients' },
              { name: '/client-dashboard', description: 'Client Dashboard — location management' },
              { name: '/client-admin', description: 'Client Admin Panel — user & settings management' },
              { name: '/store-owner', description: 'Store Owner Dashboard — assigned locations only' },
              { name: '/dashboard', description: 'Legacy dashboard for users without roles' },
              { name: '/guide', description: 'End-user guide' },
              { name: '/admin-guide', description: 'This documentation page' },
              { name: '/set-password', description: 'Password setup for invited users' },
              { name: '/reset-password', description: 'Password reset flow' },
            ]} />
          </SubSection>
          <SubSection title="Database Tables">
            <FieldTable fields={[
              { name: 'businesses', description: 'All location/business records. Core data table.' },
              { name: 'clients', description: 'Client organizations. Each has a unique text ID and name.' },
              { name: 'profiles', description: 'User profile data (name, email, client_id). One per user.' },
              { name: 'user_roles', description: 'Role assignments. One role per user.' },
              { name: 'user_client_access', description: 'Links service users to their assigned clients.' },
              { name: 'user_country_access', description: 'Restricts users to specific countries within their client.' },
              { name: 'store_owner_access', description: 'Links store owners to their assigned business locations.' },
              { name: 'client_permissions', description: 'Field-level lock settings per client.' },
              { name: 'lockable_fields', description: 'Master list of fields that can be locked, with groups.' },
              { name: 'client_categories', description: 'Client-specific business categories (subset of master list).' },
              { name: 'client_custom_services', description: 'Custom services defined per client.' },
              { name: 'categories', description: 'Master category list (read-only for all users).' },
              { name: 'business_field_history', description: 'Field-level change tracking for locations.' },
              { name: 'api_feed_locations', description: 'Locations tracked from API feeds (e.g., Eco Movement).' },
              { name: 'api_import_logs', description: 'Logs for API import runs.' },
            ]} />
          </SubSection>
        </Section>

        {/* 3. Client Management */}
        <Section id="section-3" number="3" title="Client Management">
          <SubSection title="Creating a Client">
            <StepList steps={[
              'Navigate to Admin Panel (/admin).',
              'Click "Create Client" button.',
              'Enter the client name.',
              'Click "Create" — a unique client ID is auto-generated.',
              'The client appears in the client list with statistics (users, active/pending locations).',
            ]} />
            <Info>When a client is created, the <code className="bg-muted px-1 rounded">storeCode</code> field is automatically locked for users and store owners via the <code className="bg-muted px-1 rounded">auto_lock_store_code_for_new_client</code> trigger.</Info>
          </SubSection>
          <SubSection title="Client Statistics Dashboard">
            <p className="text-sm text-muted-foreground mb-2">
              The Admin Panel shows a grid of client cards, each displaying:
            </p>
            <BulletList items={[
              'Client name and ID',
              'Number of users',
              'Active locations count',
              'Pending locations count',
              'Last updated timestamp',
            ]} />
          </SubSection>
          <SubSection title="Editing a Client">
            <p className="text-sm text-muted-foreground">
              Click the client card to access the Client Dashboard. From there, manage locations, account settings (logos, opening hours, social media, service URLs), categories, custom services, and field permissions.
            </p>
          </SubSection>
          <SubSection title="Deleting a Client">
            <StepList steps={[
              'In Admin Panel, click "Delete" on the client card.',
              'Optionally check "Also delete all users" to remove associated user accounts.',
              'Type the client name exactly to confirm.',
              'Click "Delete" — the edge function delete-client handles cascading cleanup.',
            ]} />
            <Warning>Deleting a client removes ALL associated locations, categories, custom services, permissions, and optionally users. This action is irreversible.</Warning>
          </SubSection>
          <SubSection title="Updating Client ID">
            <p className="text-sm text-muted-foreground">
              Admins can update a client's ID via the Admin Panel. The <code className="bg-muted px-1 rounded">update-client-id</code> edge function updates the ID across all related tables (businesses, profiles, permissions, categories, custom services, client access, and field history) in a transactional manner.
            </p>
          </SubSection>
        </Section>

        {/* 4. User Onboarding */}
        <Section id="section-4" number="4" title="User Onboarding & Creation">
          <SubSection title="Standard Invitation Flow">
            <StepList steps={[
              'Navigate to User Management for the target client.',
              'Click "Create User".',
              'Enter: Email, First Name, Last Name.',
              'Select the role: user, client_admin, store_owner, or service_user.',
              'For Store Owners: select the specific stores they should access (mandatory).',
              'For users needing country restrictions: assign countries after creation.',
              'Click "Create" — an invitation email is sent via Supabase Auth.',
              'The user receives an email with a link to set their password.',
              'After setting their password, they can log in and are redirected based on their role.',
            ]} />
          </SubSection>
          <SubSection title="Admin Direct Password Creation">
            <p className="text-sm text-muted-foreground mb-2">
              Admins (only) can bypass the invite flow and create users with a password directly:
            </p>
            <StepList steps={[
              'In the Create User dialog, enter a password (minimum 6 characters).',
              'The user account is created immediately with email confirmed.',
              'No invitation email is sent — share credentials manually.',
            ]} />
            <Warning>Only users with the Admin role can set passwords directly. Service Users and Client Admins always use the invitation flow.</Warning>
          </SubSection>
          <SubSection title="Service User Creation (from Client Dashboard)">
            <p className="text-sm text-muted-foreground">
              When creating a Service User from a client's dashboard, the user is automatically given access to that client via the <code className="bg-muted px-1 rounded">user_client_access</code> table. Additional client assignments can be added later.
            </p>
          </SubSection>
          <SubSection title="What Happens on User Creation (Backend)">
            <p className="text-sm text-muted-foreground mb-2">
              The <code className="bg-muted px-1 rounded">create-user</code> edge function performs these steps:
            </p>
            <StepList steps={[
              'Validates the caller has sufficient permissions (admin, service_user, or client_admin).',
              'For service users: verifies they have access to the target client.',
              'For client admins: verifies the target client matches their own client.',
              'Creates the auth user (via invite or direct password).',
              'Creates a profile record in the profiles table.',
              'Assigns the specified role in user_roles.',
              'For store_owner: creates store_owner_access records for assigned stores.',
              'For service_user: creates a user_client_access record.',
              'For users with country restrictions: creates user_country_access records.',
            ]} />
          </SubSection>
          <SubSection title="Set Password Page (/set-password)">
            <p className="text-sm text-muted-foreground">
              Invited users land on this page via the email link. They enter and confirm their password. After submission, they're redirected to login. The page extracts the email from the URL parameters for a seamless experience.
            </p>
          </SubSection>
        </Section>

        {/* 5. Offboarding */}
        <Section id="section-5" number="5" title="User Offboarding & Deletion">
          <SubSection title="Deleting a User">
            <StepList steps={[
              'In User Management, locate the user.',
              'Click the "Delete" button (trash icon).',
              'Confirm the deletion in the dialog.',
              'The delete-user edge function removes the user from auth, profiles, roles, and all access tables.',
            ]} />
            <Info>Deleted users' historical changes remain in <code className="bg-muted px-1 rounded">business_field_history</code> for audit purposes (their email is stored in <code className="bg-muted px-1 rounded">changed_by_email</code>).</Info>
          </SubSection>
          <SubSection title="Reassigning a User">
            <p className="text-sm text-muted-foreground">
              Instead of deleting, you can reassign a user to a different client. Use the "Reassign" button in User Management. This updates their <code className="bg-muted px-1 rounded">profiles.client_id</code> and clears any previous store_owner_access or country_access records.
            </p>
          </SubSection>
        </Section>

        {/* 6. User Management Operations */}
        <Section id="section-6" number="6" title="User Management Operations">
          <SubSection title="Changing a User's Role">
            <p className="text-sm text-muted-foreground mb-2">
              Use the Role Change dialog. The old role is deleted and the new role is inserted. Constraints apply:
            </p>
            <BulletList items={[
              'Admins can change any role to any role.',
              'Service Users can only assign user, store_owner, client_admin.',
              'Client Admins can only assign user and store_owner.',
              'Changing from store_owner clears all store_owner_access records.',
              'Changing to store_owner requires assigning stores afterward.',
            ]} />
          </SubSection>
          <SubSection title="Managing Country Access">
            <p className="text-sm text-muted-foreground mb-2">
              Country access restricts which locations a user can see/edit, filtered by the <code className="bg-muted px-1 rounded">country</code> field on businesses. Managed via the Globe icon in User Management.
            </p>
            <BulletList items={[
              'No country restrictions = user sees all locations in their client.',
              'One or more countries assigned = user only sees locations in those countries.',
              'Countries can be added/removed at any time.',
            ]} />
          </SubSection>
          <SubSection title="Managing Store Owner Access">
            <p className="text-sm text-muted-foreground">
              For store_owner users, use the Store icon to manage which specific locations they can access. A searchable checkbox list shows all locations in the client. Store owners can only view/edit their assigned locations.
            </p>
          </SubSection>
          <SubSection title="Sending Password Recovery">
            <p className="text-sm text-muted-foreground">
              Click the "Recovery" button (KeyRound icon) on any user to send them a password reset email. Uses the <code className="bg-muted px-1 rounded">generate-invite-link</code> edge function to create a recovery link via Supabase Auth.
            </p>
          </SubSection>
          <SubSection title="Service User Client Access">
            <p className="text-sm text-muted-foreground">
              Service users can be assigned to multiple clients. In the Admin Panel, use the client access management dialog to add/remove client assignments. Each assignment creates/removes records in <code className="bg-muted px-1 rounded">user_client_access</code>.
            </p>
          </SubSection>
        </Section>

        {/* 7. Location Data Model */}
        <Section id="section-7" number="7" title="Location (Business) Data Model">
          <SubSection title="Required Fields">
            <FieldTable fields={[
              { name: 'storeCode', description: 'Unique identifier. Auto-generated (STORE000001 pattern) or custom. Locked by default for users/store owners.', required: true },
              { name: 'businessName', description: 'Official business name.', required: true },
              { name: 'addressLine1', description: 'Primary street address.', required: true },
              { name: 'country', description: 'Country code (e.g., DE, NL, US).', required: true },
              { name: 'primaryCategory', description: 'Main Google category (e.g., "Restaurant").', required: true },
            ]} />
          </SubSection>
          <SubSection title="Address Fields">
            <FieldTable fields={[
              { name: 'addressLine2-5', description: 'Additional address lines (suite, floor, building).' },
              { name: 'city', description: 'City name.' },
              { name: 'state', description: 'State or province.' },
              { name: 'postalCode', description: 'ZIP/postal code.' },
              { name: 'district', description: 'District or neighborhood.' },
            ]} />
          </SubSection>
          <SubSection title="Contact & Web">
            <FieldTable fields={[
              { name: 'primaryPhone', description: 'Main phone number.' },
              { name: 'additionalPhones', description: 'Comma-separated additional numbers.' },
              { name: 'website', description: 'Business website URL. Must include http:// or https:// protocol.' },
            ]} />
          </SubSection>
          <SubSection title="Service URLs">
            <FieldTable fields={[
              { name: 'appointmentURL', description: 'Appointment booking link.' },
              { name: 'menuURL', description: 'Menu or product list link.' },
              { name: 'reservationsURL', description: 'Reservations link.' },
              { name: 'orderAheadURL', description: 'Order-ahead link.' },
            ]} />
            <Warning>All URLs must include the protocol prefix (http:// or https://). URLs starting with "www." without a protocol will fail validation and move the location to "Need Attention".</Warning>
          </SubSection>
          <SubSection title="Opening Hours">
            <p className="text-sm text-muted-foreground mb-2">
              Seven day-of-week fields: <code className="bg-muted px-1 rounded">mondayHours</code> through <code className="bg-muted px-1 rounded">sundayHours</code>.
            </p>
            <BulletList items={[
              'Format: HH:MM-HH:MM (e.g., "09:00-17:00")',
              'Multiple ranges: comma-separated (e.g., "09:00-12:00, 13:00-17:00")',
              'Closed: use "x" (lowercase)',
              'Empty = not specified',
            ]} />
          </SubSection>
          <SubSection title="Additional Fields">
            <FieldTable fields={[
              { name: 'additionalCategories', description: 'Comma-separated extra categories.' },
              { name: 'labels', description: 'Internal organizational tags.' },
              { name: 'openingDate', description: 'Date the business opens/opened. Must be within 6 months of today if in the future.' },
              { name: 'temporarilyClosed', description: 'Boolean flag for temporary closure.' },
              { name: 'fromTheBusiness', description: 'Business description text.' },
              { name: 'adwords', description: 'AdWords location extension phone.' },
              { name: 'goldmine', description: 'Client-specific reference field.' },
              { name: 'specialHours', description: 'Holiday/special hours in specific format.' },
              { name: 'moreHours', description: 'Additional hour types (JSON).' },
              { name: 'customServices', description: 'Assigned custom services (JSON).' },
              { name: 'socialMediaUrls', description: 'Social media links (JSON object).' },
              { name: 'relevantLocation', description: 'Location hierarchy data (JSON).' },
              { name: 'latitude / longitude', description: 'GPS coordinates.' },
              { name: 'logoPhoto / coverPhoto / otherPhotos', description: 'Photo URLs.' },
              { name: 'is_async', description: 'Flag for locations pending external sync.' },
            ]} />
          </SubSection>
        </Section>

        {/* 8. Location Lifecycle */}
        <Section id="section-8" number="8" title="Location Lifecycle & Status">
          <SubSection title="Status Values">
            <FieldTable fields={[
              { name: 'pending', description: 'New location, not yet fully validated. Default status on creation.' },
              { name: 'active', description: 'Fully validated location. Appears in the Active tab if it also passes export validation.' },
            ]} />
          </SubSection>
          <SubSection title="Active Tab vs. Need Attention Tab">
            <p className="text-sm text-muted-foreground mb-2">
              The <strong>Active tab</strong> only shows locations that are:
            </p>
            <BulletList items={[
              'Status = "active"',
              'Pass all export validation rules (no URL errors, no missing required fields)',
              'Not flagged as async (is_async = false)',
            ]} />
            <p className="text-sm text-muted-foreground mt-2">
              Any location failing these criteria appears in <strong>Need Attention</strong>, even if its database status is "active". This ensures the Active tab exactly matches what would be exported.
            </p>
          </SubSection>
          <SubSection title="Async Locations">
            <p className="text-sm text-muted-foreground">
              Locations with <code className="bg-muted px-1 rounded">is_async = true</code> are waiting for an external system to process them. They always appear in Need Attention until the external sync completes and clears the flag.
            </p>
          </SubSection>
        </Section>

        {/* 9. Validation Layers */}
        <Section id="section-9" number="9" title="Validation Layers">
          <p className="text-sm text-muted-foreground mb-3">
            Jasoner enforces validation at three distinct layers to ensure data integrity:
          </p>
          <SubSection title="Layer 1: Frontend Form Validation (BusinessDialog)">
            <p className="text-sm text-muted-foreground mb-2">
              Zod schemas validate user input in real-time when adding or editing a location:
            </p>
            <BulletList items={[
              'Required fields: businessName, addressLine1, country, primaryCategory',
              'URL format: must start with http:// or https://',
              'Opening date: must not be more than 6 months in the future',
              'Phone format: basic validation',
              'Coordinates: must be valid numbers within range',
            ]} />
          </SubSection>
          <SubSection title="Layer 2: Import Validation (importValidation.ts)">
            <p className="text-sm text-muted-foreground mb-2">
              When importing from CSV/XLS/JSON files, additional checks run:
            </p>
            <BulletList items={[
              'Column mapping verification (required columns present)',
              'DMS coordinate detection and warning',
              'Opening hours format validation (HH:MM-HH:MM)',
              'HTML tag detection in text fields',
              'Duplicate storeCode detection',
              'URL protocol enforcement',
              'Opening date future limit check (6 months)',
              'Required field presence (storeCode, businessName, addressLine1, country, primaryCategory)',
            ]} />
          </SubSection>
          <SubSection title="Layer 3: Export Validation (exportValidation.ts + Edge Functions)">
            <p className="text-sm text-muted-foreground mb-2">
              The strictest layer — runs when generating JSON/CSV/XLS exports and also determines which locations appear in the Active tab:
            </p>
            <BulletList items={[
              'All required fields must be present and non-empty',
              'URL fields validated with mandatory protocol prefix',
              'Social media URLs validated individually',
              'Opening hours format enforced (HH:MM-HH:MM or "x")',
              'Opening date within 6 months window',
              'Async locations excluded from export',
              'Locations failing any check are filtered to Need Attention',
            ]} />
            <Info>The same validation logic runs in both the frontend (<code className="bg-muted px-1 rounded">src/lib/exportValidation.ts</code>) and the backend edge functions (<code className="bg-muted px-1 rounded">generate-json-export</code>, <code className="bg-muted px-1 rounded">manual-json-export</code>) for consistency.</Info>
          </SubSection>
          <SubSection title="Layer 4: Database-Level Validation">
            <BulletList items={[
              'NOT NULL constraints on required columns',
              'Default values (status defaults to "pending", storeCode auto-generated)',
              'Opening hours validated by validate_opening_hours() database function',
              'RLS policies prevent unauthorized data access',
            ]} />
          </SubSection>
        </Section>

        {/* 10. Import System */}
        <Section id="section-10" number="10" title="Import System">
          <SubSection title="Supported Formats">
            <BulletList items={[
              'CSV (comma-separated)',
              'XLS / XLSX (Excel)',
              'JSON (array format, or object with "businesses" or "locations" key)',
            ]} />
          </SubSection>
          <SubSection title="Import Workflow">
            <StepList steps={[
              'Click "Import" on the dashboard.',
              'Upload your file (drag & drop or browse).',
              'The system auto-detects columns and maps them to business fields.',
              'Review the column mapping — green checkmarks for required fields, blue for optional.',
              'Asterisk (*) next to green checkmarks indicates required fields.',
              'Fix any validation warnings shown in the preview.',
              'Choose import mode: "Add new only" or "Update existing + add new".',
              'Click Import — locations are created/updated in the database.',
            ]} />
          </SubSection>
          <SubSection title="Column Mapping Aliases">
            <p className="text-sm text-muted-foreground">
              The import system recognizes common aliases. For example, <code className="bg-muted px-1 rounded">locality</code> maps to <code className="bg-muted px-1 rounded">city</code>. This helps when importing from Google Takeout or other systems with different naming conventions.
            </p>
          </SubSection>
          <SubSection title="Field History Tracking on Import">
            <p className="text-sm text-muted-foreground">
              All field changes made during import are tracked in <code className="bg-muted px-1 rounded">business_field_history</code> with change_source = "import". This provides a full audit trail of what changed and when.
            </p>
          </SubSection>
        </Section>

        {/* 11. Export System */}
        <Section id="section-11" number="11" title="Export System">
          <SubSection title="Export Formats">
            <BulletList items={[
              'JSON — Google Business Profile compatible schema',
              'CSV — Spreadsheet-ready format',
              'XLS — Excel format',
            ]} />
          </SubSection>
          <SubSection title="What Gets Exported">
            <BulletList items={[
              'Only locations that pass all export validation rules',
              'Async locations (is_async = true) are excluded',
              'Locations with status "pending" are excluded',
              'Locations with validation errors are excluded',
              'Export count always matches the Active tab count',
            ]} />
          </SubSection>
          <SubSection title="Automatic JSON Export">
            <p className="text-sm text-muted-foreground">
              A database trigger (<code className="bg-muted px-1 rounded">trigger_json_export</code>) fires on every INSERT, UPDATE, or DELETE on the <code className="bg-muted px-1 rounded">businesses</code> table. It calls the <code className="bg-muted px-1 rounded">generate-json-export</code> edge function, which generates a JSON file and stores it in the <code className="bg-muted px-1 rounded">json-exports</code> storage bucket at <code className="bg-muted px-1 rounded">{'{client_id}'}/businesses.json</code>.
            </p>
          </SubSection>
          <SubSection title="Manual Export">
            <p className="text-sm text-muted-foreground">
              Users can manually export via the "Export" button on the dashboard. The <code className="bg-muted px-1 rounded">manual-json-export</code> edge function generates the file on demand in the selected format. File naming: <code className="bg-muted px-1 rounded">ClientName-DD-MM-YYYY.{'{ext}'}</code>.
            </p>
          </SubSection>
        </Section>

        {/* 12. Backup & Version History */}
        <Section id="section-12" number="12" title="Backup & Version History">
          <SubSection title="CRUD Backups (Automatic)">
            <BulletList items={[
              'Triggered on every INSERT/UPDATE/DELETE via the trigger_crud_backup database trigger',
              'Calls the crud-backup edge function',
              'Stores JSON backup in json-backups bucket at {client_id}/crud/',
              'Naming: ClientName-DD-MM-YYYY-HH:MM.json',
              'Keeps last 5 backups per client (older ones auto-deleted)',
            ]} />
          </SubSection>
          <SubSection title="Weekly Scheduled Backups">
            <BulletList items={[
              'Runs every Monday at 10:00 AM via the scheduled-backup edge function',
              'Stores in json-backups bucket at {client_id}/weekly/',
              'Naming: ClientName-Weekly-DD.MM.YYYY.json',
              'Keeps last 12 weeks of backups',
            ]} />
          </SubSection>
          <SubSection title="Field-Level Version History">
            <p className="text-sm text-muted-foreground mb-2">
              Every individual field change is tracked in <code className="bg-muted px-1 rounded">business_field_history</code>:
            </p>
            <BulletList items={[
              'Records: old_value, new_value, changed_by, changed_by_email, timestamp, change_source',
              'Change sources: manual_edit, import, multi_edit, bulk_update, rollback',
              'Rollback functionality: restore any field to a previous value',
              'Automatic cleanup: keeps last 6 versions per field (via cleanup_field_history trigger)',
              'Deletion tracking: business_deleted events are recorded with storeCode and businessName',
            ]} />
          </SubSection>
          <SubSection title="Version History UI">
            <p className="text-sm text-muted-foreground">
              Accessible from the dashboard, the Version History dialog has three tabs:
            </p>
            <BulletList items={[
              'JSON Backups — Download, import, or delete backup files',
              'Location Updates — View per-location field changes',
              'All Changes — Full timeline with filters by field, user, and date',
            ]} />
          </SubSection>
        </Section>

        {/* 13. Field-Level Access Control */}
        <Section id="section-13" number="13" title="Field-Level Access Control (Permissions)">
          <SubSection title="How It Works">
            <p className="text-sm text-muted-foreground mb-2">
              Admins and Service Users can lock specific fields for Users, Store Owners, and/or Client Admins. Client Admins can lock fields for Users and Store Owners (but not for themselves).
            </p>
            <BulletList items={[
              'Fields are organized into groups: Basic Info, Address Details, Location, Categories, Contact, Marketing, Opening Hours, Dates, Status, Photos, Service URLs, Additional Features, Import Function',
              'Category-wide toggle: lock all fields in a group at once',
              'Granular toggle: lock individual fields within a group',
              'Locked fields appear disabled with a lock icon and tooltip explaining the restriction',
              'The Import Function group can disable the entire import feature for specific roles',
            ]} />
          </SubSection>
          <SubSection title="Configuration">
            <p className="text-sm text-muted-foreground">
              Access the Field Permissions dialog from the Client Dashboard or Admin Panel. The <code className="bg-muted px-1 rounded">client_permissions</code> table stores per-field lock state with columns: <code className="bg-muted px-1 rounded">locked_for_user</code>, <code className="bg-muted px-1 rounded">locked_for_store_owner</code>, <code className="bg-muted px-1 rounded">locked_for_client_admin</code>.
            </p>
          </SubSection>
        </Section>

        {/* 14. Custom Services */}
        <Section id="section-14" number="14" title="Custom Services Management">
          <SubSection title="Overview">
            <p className="text-sm text-muted-foreground mb-2">
              Custom services are configured at the client level and assigned to individual locations. Each service has:
            </p>
            <BulletList items={[
              'Service Name (required)',
              'Service Description (optional)',
              'Service Category IDs — comma-separated GCIDs for category matching',
            ]} />
          </SubSection>
          <SubSection title="Category-Based Eligibility">
            <p className="text-sm text-muted-foreground">
              When a service has category IDs assigned, it is only eligible for locations that share at least one matching category. If no categories are assigned, the service is "Eligible for all categories." This is displayed as inline badges on the service list, and a yellow alert disclaimer explains the restriction.
            </p>
          </SubSection>
          <SubSection title="Assigning Services to Locations">
            <p className="text-sm text-muted-foreground">
              In the location edit dialog, the Custom Services section shows only eligible services. Toggle services on/off. The selection is stored as JSON in the <code className="bg-muted px-1 rounded">customServices</code> field on the business record.
            </p>
          </SubSection>
        </Section>

        {/* 15. Edge Functions Reference */}
        <Section id="section-15" number="15" title="Edge Functions Reference">
          <FieldTable fields={[
            { name: 'create-user', description: 'Creates a new user with role, profile, and access records. Supports invite flow and direct password. Validates caller permissions.' },
            { name: 'create-admin-user', description: 'Bootstrap function to create the initial admin user. No JWT required (verify_jwt = false). Should be disabled after first use.' },
            { name: 'delete-user', description: 'Removes a user from auth, profiles, roles, and all access tables. Requires admin or authorized role.' },
            { name: 'delete-client', description: 'Deletes a client and all associated data (locations, categories, services, permissions). Optionally deletes all users.' },
            { name: 'update-client-id', description: 'Updates a client ID across all related tables transactionally.' },
            { name: 'generate-json-export', description: 'Auto-triggered on business changes. Generates validated JSON export and stores in json-exports bucket. No JWT (triggered by DB).' },
            { name: 'manual-json-export', description: 'On-demand export in JSON/CSV/XLS format. JWT required. Runs same validation as auto-export.' },
            { name: 'generate-invite-link', description: 'Generates password recovery or invite links via Supabase Auth admin API. No JWT (used internally).' },
            { name: 'generate-lsc-magic-link', description: 'LSC integration: generates magic link for existing users. Validates API key. No JWT.' },
            { name: 'crud-backup', description: 'Creates a CRUD backup JSON file. Triggered by DB on business changes. Maintains 5-backup rolling window.' },
            { name: 'scheduled-backup', description: 'Weekly backup function. Runs every Monday 10 AM. Maintains 12-week rolling window.' },
            { name: 'sync-to-gcp', description: 'Syncs JSON export files to Google Cloud Storage. Uses SERVICE_ACCOUNT_KEY secret.' },
            { name: 'import-eco-movement', description: 'Imports location data from Eco Movement API. Uses ECO_MOVEMENT_API_TOKEN secret.' },
          ]} />
          <SubSection title="JWT Configuration">
            <p className="text-sm text-muted-foreground mb-2">
              Edge functions have explicit JWT verification settings in <code className="bg-muted px-1 rounded">supabase/config.toml</code>:
            </p>
            <BulletList items={[
              'verify_jwt = true: create-user, manual-json-export, delete-client, delete-user, update-client-id',
              'verify_jwt = false: generate-json-export, create-admin-user, generate-invite-link, sync-to-gcp, scheduled-backup, crud-backup, import-eco-movement, generate-lsc-magic-link',
            ]} />
            <Info>Functions with verify_jwt = false implement their own authentication checks internally (API keys, service role checks, etc.).</Info>
          </SubSection>
        </Section>

        {/* 16. Database Triggers */}
        <Section id="section-16" number="16" title="Database Triggers & Automations">
          <FieldTable fields={[
            { name: 'handle_new_user', description: 'Fires on auth.users INSERT. Creates profile, assigns client (from metadata or auto-generates new client).' },
            { name: 'trigger_json_export', description: 'Fires on businesses INSERT/UPDATE/DELETE. Calls generate-json-export edge function for automatic export regeneration.' },
            { name: 'trigger_crud_backup', description: 'Fires on businesses INSERT/UPDATE/DELETE. Calls crud-backup edge function for automatic backup.' },
            { name: 'track_business_deletion', description: 'Fires BEFORE DELETE on businesses. Records deletion in business_field_history with storeCode and businessName.' },
            { name: 'cleanup_field_history', description: 'Fires AFTER INSERT on business_field_history. Keeps only the last 6 versions per field per business.' },
            { name: 'auto_lock_store_code_for_new_client', description: 'Fires on clients INSERT. Automatically locks the storeCode field for users and store owners.' },
            { name: 'update_updated_at_column', description: 'Generic trigger to update the updated_at timestamp on row modification.' },
          ]} />
        </Section>

        {/* 17. Storage Buckets */}
        <Section id="section-17" number="17" title="Storage Buckets">
          <FieldTable fields={[
            { name: 'business-photos', description: 'Stores uploaded logo and cover photos for locations. Public bucket — photos accessible via URL.' },
            { name: 'json-exports', description: 'Stores auto-generated JSON export files per client. Private bucket. Path: {client_id}/businesses.json.' },
            { name: 'json-backups', description: 'Stores CRUD and weekly backup files. Private bucket. Paths: {client_id}/crud/ and {client_id}/weekly/.' },
          ]} />
        </Section>

        {/* 18. Authentication & Security */}
        <Section id="section-18" number="18" title="Authentication & Security">
          <SubSection title="Authentication Flow">
            <BulletList items={[
              'Email/password authentication via Supabase Auth',
              'Invitation-based user creation (no self-registration)',
              'Password recovery via email with secure reset links',
              'Magic link authentication for LSC integration',
              'Session managed by Supabase with automatic token refresh',
            ]} />
          </SubSection>
          <SubSection title="Row-Level Security (RLS)">
            <p className="text-sm text-muted-foreground mb-2">
              Every table has RLS enabled with restrictive policies (default deny). Key patterns:
            </p>
            <BulletList items={[
              'Admin role: full access to all tables',
              'Service user: access scoped to assigned clients via user_client_access',
              'Client admin / User: access scoped to their own client via profiles.client_id',
              'Store owner: access scoped to assigned businesses via store_owner_access',
              'Service role: full access (used by edge functions with service_role_key)',
              'Security definer functions (has_role, can_access_business, etc.) prevent recursive RLS evaluation',
            ]} />
          </SubSection>
          <SubSection title="Secrets Management">
            <FieldTable fields={[
              { name: 'SUPABASE_URL', description: 'Supabase project URL. Auto-configured.' },
              { name: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Service role key for admin-level database operations in edge functions.' },
              { name: 'SUPABASE_ANON_KEY', description: 'Anonymous key for client-side operations.' },
              { name: 'LSC_API_KEY', description: 'API key for LSC magic link integration.' },
              { name: 'SERVICE_ACCOUNT_KEY', description: 'Google Cloud service account JSON for GCP sync.' },
              { name: 'ECO_MOVEMENT_API_TOKEN', description: 'API token for Eco Movement data import.' },
              { name: 'LOVABLE_API_KEY', description: 'Lovable AI gateway key.' },
            ]} />
          </SubSection>
        </Section>

        {/* 19. Integrations */}
        <Section id="section-19" number="19" title="Integrations">
          <SubSection title="Google Cloud Platform (GCP) Sync">
            <p className="text-sm text-muted-foreground mb-2">
              The <code className="bg-muted px-1 rounded">sync-to-gcp</code> edge function uploads JSON export files from the <code className="bg-muted px-1 rounded">json-exports</code> bucket to a GCS bucket. Triggered manually via the "Sync" button in the Admin Panel.
            </p>
          </SubSection>
          <SubSection title="LSC Magic Link Integration">
            <p className="text-sm text-muted-foreground mb-2">
              External LSC system can authenticate existing Jasoner users via magic links:
            </p>
            <StepList steps={[
              'LSC sends api_key + email to generate-lsc-magic-link edge function.',
              'Function verifies API key against LSC_API_KEY secret.',
              'Looks up existing user by email — if not found, returns error (no user creation).',
              'Generates a magic link redirecting to /client-dashboard.',
              'User clicks link and is authenticated automatically.',
            ]} />
          </SubSection>
          <SubSection title="Eco Movement API Import">
            <p className="text-sm text-muted-foreground">
              The <code className="bg-muted px-1 rounded">import-eco-movement</code> function fetches charging station data from the Eco Movement API, maps it to the Jasoner business schema, and creates/updates locations. Import logs are stored in <code className="bg-muted px-1 rounded">api_import_logs</code>.
            </p>
          </SubSection>
        </Section>

        {/* 20. Troubleshooting & FAQ */}
        <Section id="section-20" number="20" title="Troubleshooting & FAQ">
          <SubSection title="User can't log in after invitation">
            <BulletList items={[
              'Verify the invitation email was received (check spam).',
              'Ensure they used the Set Password link before trying to log in.',
              'Send a new recovery email via User Management.',
            ]} />
          </SubSection>
          <SubSection title="Location appears in 'Need Attention' but status is 'active'">
            <BulletList items={[
              'Click the red exclamation icon to see specific validation errors.',
              'Common causes: URL without protocol (www. instead of https://), missing required field, is_async flag set.',
              'Fix the validation errors — the location will automatically move to Active.',
            ]} />
          </SubSection>
          <SubSection title="Export count doesn't match location count">
            <p className="text-sm text-muted-foreground">
              Export only includes locations from the Active tab. Pending locations, async locations, and locations with validation errors are excluded. The Active tab count should exactly match the export count.
            </p>
          </SubSection>
          <SubSection title="User can't edit certain fields">
            <BulletList items={[
              'Check field permissions — the field may be locked for their role.',
              'Navigate to Field Permissions in the client settings.',
              'Look for the lock icon and tooltip on the field.',
            ]} />
          </SubSection>
          <SubSection title="Import shows validation warnings">
            <BulletList items={[
              'Review each warning — they indicate data quality issues.',
              'Common: coordinates in DMS format (need decimal), URLs without protocol.',
              'Warnings don\'t block import but locations may land in Need Attention.',
            ]} />
          </SubSection>
          <SubSection title="Duplicate email error when creating user">
            <p className="text-sm text-muted-foreground">
              A user with that email already exists in Supabase Auth. Either use a different email or delete the existing user first if appropriate. The edge function returns a user-friendly "email_exists" error.
            </p>
          </SubSection>
          <SubSection title="Store Owner can't see any locations">
            <BulletList items={[
              'Verify stores have been assigned via the Store icon in User Management.',
              'Check that the user has the store_owner role (not user).',
              'Verify the assigned stores have the correct client_id.',
            ]} />
          </SubSection>
        </Section>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border text-center text-xs text-muted-foreground print:mt-8">
          <p>Jasoner Admin & Service User Guide — {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })} — Confidential</p>
          <p className="mt-1">For questions or support, contact the Jasoner development team.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminGuide;
