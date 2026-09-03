# Super-Admin Account — Feature Specification Document

## 1. PURPOSE & OVERVIEW

The **Super-Admin Account** is a privileged administrative role with the highest level of access to the Matthew Studio platform. The super-admin account is responsible for:

- System configuration and platform-wide settings
- Creation and management of admin accounts
- Access to the admin vault (emergency credentials)
- Full audit and security log access
- Platform health and analytics dashboard
- Full editorial control over all visitor-facing content (Section 3.7)
- Management of buyer accounts, products, and orders (Sections 3.8, 3.10, 3.11)
- Publishing site-wide announcements (Section 3.9)
- Assigning tasks and customers to specific admins (Sections 3.12, 3.13)

**Target User:** Platform owner / system administrator

---

## 2. ACCOUNT CREATION & AUTHENTICATION

### 2.1 — Account Creation Process

**CRITICAL:** Super-admin accounts are **NEVER created via public registration**. Registration is ONLY for buyer accounts.

**Super-Admin Account Initialization (Platform Setup):**

1. **Initial Setup (First-Time Admin):**
   - Manually created by platform owner via Supabase dashboard (`Supabase → Authentication → Users → Add User`)
   - Email: platform owner's email
   - Password: manually set by owner (must be strong)
   - Role in `user_metadata`: `"role": "superAdmin"`
   - Verified: email must be manually verified or confirmation sent

2. **Supabase Configuration (Required):**
   ```json
   {
     "user_metadata": {
       "role": "superAdmin",
       "createdAt": "2026-09-01T00:00:00Z",
       "createdBy": "system-init"
     }
   }
   ```

### 2.2 — Super-Admin Login

- **Route:** `/auth/login` (shared with buyer/admin)
- **Process:**
  1. Enter email + password
  2. Supabase authenticates against `auth.users` table
  3. Check `user_metadata.role` in JWT token (middleware.ts)
  4. If role = "superAdmin" → redirect to `/superAdmin/dashboard`
  5. If role ≠ "superAdmin" → reject with "Unauthorized" (401)

- **Session Token:**
  - HttpOnly cookie (name: `session`, maxAge: 7 days)
  - Contains JWT with role claim
  - Refresh token rotated every 24 hours (Rule 32.3)

### 2.3 — Middleware Protection (middleware.ts)

```typescript
if (pathname.startsWith("/superAdmin")) {
  if (userRole !== "superAdmin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
```

**Result:** Only authenticated users with `role = "superAdmin"` can access `/superAdmin/*` routes.

---

## 3. SUPER-ADMIN DASHBOARD & PAGES

### 3.1 — Dashboard Home (/superAdmin/dashboard)

**Purpose:** Platform overview and quick access to all admin functions

**Sections:**

1. **Platform Health Widget**
   - Total users (buyers, admins)
   - Active sessions (last 24h)
   - API uptime (Supabase status)
   - Last backup timestamp + status

2. **Recent Activity**
   - Last 10 security events (Rule 38: login attempts, admin actions, anomalies)
   - Last 5 account activity events (Rule 42)
   - Filter by event type

3. **Quick Actions (Cards)**
   - "Create Admin Account" → `/superAdmin/admin-management/create`
   - "Manage Admins" → `/superAdmin/admin-management`
   - "View Security Logs" → `/superAdmin/security-logs`
   - "View Account Activity" → `/superAdmin/account-activity`
   - "View Backups" → `/superAdmin/backups`
   - "Access Vault" → `/superAdmin/vault`
   - "Manage Device Bans" → `/superAdmin/gatekeeper` (per `gatekeeper_specification.md`)

4. **Analytics Summary**
   - Total products across marketplace
   - New buyers (last 7 days)
   - Revenue by category (if applicable)

---

### 3.2 — Admin Management (/superAdmin/admin-management)

#### 3.2.1 — Admin List Page

**Purpose:** View and manage all admin accounts

**Content:**

- Paginated table (25 per page, newest first)
- Columns: Email, Name, Created Date, Last Login, Status (Active/Inactive), Actions
- Filters: Status, Created Date Range, Search by email/name
- Export: CSV with all admin data

**Row Actions:**

- **View Details** → `/superAdmin/admin-management/[adminId]`
- **Edit** → `/superAdmin/admin-management/[adminId]/edit`
- **Deactivate/Reactivate** → Toggle status (confirmation modal required)
- **Reset Password** → Send password reset email (confirmation modal)
- **Delete** → Permanently remove (ONLY super-admin can do this, confirmation modal with 5-second delay)

**Status Indicators:**

- 🟢 Active — can access dashboard
- 🟡 Inactive — login disabled, no access
- 🔴 Locked — too many failed login attempts (auto-recovery after 1 hour)

---

#### 3.2.2 — Create Admin Account (/superAdmin/admin-management/create)

**Purpose:** Super-admin creates a new admin account

**Form Fields:**

- **Full Name** (text, required, min 2 chars)
- **Email** (email, required, must be unique — checked via API)
- **Permissions** (checkbox group, required):
  - ☐ Manage Products
  - ☐ Manage Orders
  - ☐ Manage Users
  - ☐ View Analytics
  - ☐ View Security Logs
  - ☐ Manage Promotions
  - (Super-admin has all permissions by default, non-editable)

**Process:**

1. Super-admin fills form and clicks "Create Account"
2. Validation: all required fields, unique email (API check)
3. Backend creates Supabase user with role = "admin" + permissions in `user_metadata.permissions`
4. Generate temporary password (16 chars, alphanumeric + special)
5. Send email to new admin with:
   - Login link: `/auth/login`
   - Email: [new admin email]
   - Temporary password: [password]
   - Note: "You must change this password on first login"
6. Toast: ✓ "Admin account created. Credentials sent to [email]."
7. Redirect to `/superAdmin/admin-management/[newAdminId]` (view details)

**API Endpoint:**

```
POST /api/admin/create-admin
{
  "fullName": "John Admin",
  "email": "john.admin@example.com",
  "permissions": ["manage-products", "manage-orders", "view-analytics"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "adminId": "uuid",
    "email": "john.admin@example.com",
    "createdAt": "2026-09-01T12:00:00Z",
    "createdBy": "superAdmin@example.com"
  },
  "message": "Admin account created. Credentials sent."
}
```

**Security Logs:**

- Event: `admin_created`
- Actor: Super-admin email
- Details: "New admin account created for [email]"

---

#### 3.2.3 — Admin Details & Edit Page (/superAdmin/admin-management/[adminId]/edit)

**Purpose:** View and update admin account details

**Display Section:**

- Email, full name, role
- Created date + creator email
- Last login date/time + IP + location (city-level)
- Current status (Active/Inactive)
- Permissions checklist (read-only for view, editable in edit mode)

**Edit Fields:**

- Full name (text, required)
- Permissions (checkbox group, updateable)
- Status toggle (Active/Inactive)

**Actions:**

- "Save Changes" button (disabled during submission)
- "Cancel" link (discard changes)
- "Reset Password" button (separate, sends email with reset link)
- "Deactivate Account" button (red, confirmation modal, disables login)

**Toast on Save:**

- ✓ "Admin account updated."
- Security log: `admin_updated`, listing what changed

---

### 3.3 — Security Logs (/superAdmin/security-logs)

**Purpose:** Monitor and investigate security events (Rule 38)

**Content:**

- Paginated DataTable (25 per page, newest first)
- Columns: Event Type (badge), Actor, Device/Location, IP, Timestamp
- Expandable rows: Raw event data (device fingerprint, geolocation, user-agent, browser/OS)

**Filters:**

- Event type (login_success, login_failed, rate_limit_hit, etc.)
- Device type (mobile, tablet, desktop)
- Country (ISO code)
- Date range

**Status Badges:**

- 🟢 login_success — green
- 🔴 login_failed — red
- 🟡 rate_limit_hit — amber
- 🔵 admin_action — blue
- 🔴 sql_injection_attempt — dark red
- 🟡 location_anomaly — orange
- 🔵 device_change — blue

---

### 3.4 — Account Activity Log (/superAdmin/account-activity)

**Purpose:** Track authenticated super-admin and admin actions (Rule 42)

**Content:**

- Paginated DataTable (25 per page, newest first)
- Columns: Account Email, Action (page visited OR discrete action), IP, Device, When
- Expandable rows: Full user-agent, geolocation (city-level)

**Filters:**

- Account (dropdown, select specific admin or "All")
- Action type (page visit, admin-created, product-updated, etc.)
- Date range

---

### 3.5 — Backups (/superAdmin/backups)

**Purpose:** Manage database backups and disaster recovery (Rule 40)

**Content:**

- Read-only DataTable (25 per page, newest first)
- Columns: Date, Status (success/failed/running badge), File Size, R2 Link, Google Drive Link, Error Message

**Status Badges:**

- 🟢 success — all destinations succeeded
- 🟡 partial — at least one destination failed, details in error message
- 🔴 failed — all destinations failed
- ⏳ running — backup in progress

**Actions:**

- None (no "Run Backup Now" button; backups are automated per Rule 40.5)
- View download links for R2 and Google Drive
- Expand row to see detailed error logs if status = failed

---

### 3.6 — Vault / Emergency Credentials (/superAdmin/vault)

**Purpose:** Generate and manage emergency backup access credentials

**Landing Page:**

- Subheading: "Generate backup access credentials for emergency admin access"
- CTA: "Generate New Credentials" → modal form
- Table of previously generated credentials:
  - Columns: Created Date, Created By (admin email), Used (yes/no), Used At, Status (Active/Revoked)
  - Actions: View (read-only details), Revoke (confirmation modal, disable immediately)

**Generate Modal:**

- **Reason** (dropdown, required):
  - Emergency access
  - Delegated temporary admin task
  - Backup authentication method
- **Expires In** (dropdown, required):
  - 1 hour
  - 4 hours
  - 24 hours
- **Description** (textarea, optional, max 200 chars)
- Button: "Generate Credentials" (disabled during submission)

**On Submit:**

1. Generate 32-char alphanumeric secret key
2. Create vault record in DB (status: active)
3. Redirect to `/superAdmin/vault/[secretId]` (display-only page)

**Vault Details Page (/superAdmin/vault/[secretId]):**

- Secret key displayed in a copy-to-clipboard box (mono font, faded background)
- Expiry countdown timer (e.g., "Expires in 3 hours 42 minutes")
- "Copy to Clipboard" button
- "Revoke Immediately" button (red)
- Note: "This credential provides full admin access. Treat it like your house key."

---

### 3.7 — Content Management / CMS (/superAdmin/content)

**Purpose:** Super-admin can edit all visitor-facing content without a code deployment.

**Editable sections:**

- Homepage: Hero copy/CTAs, QuickWins stats, per-category showcase blurbs, How It Works steps, Testimonials carousel entries, FAQ accordion entries, CTA banner copy
- Shop/pricing: tier names, pricing, feature bullets
- Standalone pages: Features page copy, Testimonials page quotes, Blog posts (create/edit/delete)
- Site-wide: Footer text, social links, NavBar links

**Content:**

- Left panel: section tree (Homepage > Hero, Homepage > FAQ, Shop > Pricing Tiers, Blog, etc.)
- Right panel: form fields matching the selected section's data shape (matches the existing `lib/*Data.ts` static data structure per section)
- "Preview" button — opens the live page in a new tab
- "Publish" button (disabled during submission) — writes to DB, visitor pages read from DB going forward instead of static `lib/*Data.ts` files
- "Revert to last published" option per section (keeps 1 prior version)

**Access:** Super-admin only. Regular admin has no CMS access unless explicitly granted via `manage-content` permission (added to the permissions list in 3.2.2).

**Security Logs:** Event `content_updated`, details: section name + which fields changed.

---

### 3.8 — Buyer Management (/superAdmin/buyer-management)

**Purpose:** Super-admin has the same level of control over buyer accounts that they have over admin accounts.

**Content:**

- Paginated table (25 per page, newest first): Email, Name, Signup Date, Last Login, Status (Active/Inactive/Locked), Total Orders, Actions
- Filters: Status, signup date range, search by email/name
- Export: CSV

**Row Actions:**

- View Details → order history, saved addresses, activity log (Rule 42)
- Deactivate/Reactivate (confirmation modal)
- Reset Password (sends reset email, confirmation modal)
- Delete Account (permanent, confirmation modal with 5-second delay — same pattern as admin delete)

**Note:** Regular admins can already view/deactivate/reset buyers per Section 4.2 — this page gives super-admin the same actions plus permanent delete, which stays super-admin-only.

**Security Logs:** Events `buyer_deactivated`, `buyer_reactivated`, `buyer_deleted`, `buyer_password_reset`.

---

### 3.9 — Announcements (/superAdmin/announcements)

**Purpose:** Super-admin publishes site-wide announcements (promos, downtime notices, new product drops).

**Content:**

- List of announcements: Title, Status (Draft/Scheduled/Live/Expired), Publish Date, Expiry Date, Placement, Actions
- "Create Announcement" button

**Create/Edit Form:**

- Title (text, required)
- Message body (textarea, required, character counter)
- Placement (dropdown, required): Homepage banner, Shop page banner, Site-wide toast on login
- Publish at (datetime, required — "now" or scheduled)
- Expires at (datetime, optional — blank = manual dismiss only)
- Status toggle: Draft / Scheduled / Live

**Actions:** Edit, Duplicate, Deactivate early, Delete (confirmation modal)

**Security Logs:** Event `announcement_published` / `announcement_deactivated`, details: title + placement.

---

### 3.10 — Product Management (/superAdmin/products)

**Purpose:** Super-admin has full CRUD over the product catalog (`lib/productsData.ts` today, moving to DB-backed per 3.7's CMS pattern).

**Content:**

- Paginated table: Product Name, Category, Price, Status (Active/Draft/Archived), Created Date, Actions
- Filters: Category (6 categories), Status, search by name
- "Add Product" button

**Create/Edit Form:**

- Name, Category (dropdown, 6 marketplace categories), Description, Price (or 3-tier pricing for Templates category), Media (Cover Image, up to 8 Gallery Images, optional Preview Video — per `product_media_upload_specification.md`, all stored in Cloudflare R2 per Rule 35.6), Status

**Row Actions:** Edit, Duplicate, Archive, Delete (confirmation modal)

**Note:** Regular admin already has `manage-products` permission per Section 4.2 — this page is the same feature set, always available to super-admin regardless of granted permissions.

**Security Logs:** Event `product_created` / `product_updated` / `product_deleted`.

---

### 3.11 — Order Management (/superAdmin/orders)

**Purpose:** Super-admin has full visibility and control over every order on the platform.

**Content:**

- Paginated table (25 per page, newest first): Order ID, Buyer, Product(s), Total, Payment Status, Order Status, Date, Actions
- Filters: Payment Status, Order Status, date range, search by buyer email or order ID
- Export: CSV

**Row Actions:**

- View Details → full order breakdown, payment record (`paymongoPaymentId`, `paidAt` per Rule 30), buyer info
- Update Order Status (dropdown: Processing / Shipped-or-Delivered-equivalent for digital delivery / Completed / Cancelled/Refunded)
- Issue Refund (confirmation modal, integrates with PayMongo refund API)
- Reassign to Admin (see 3.13 — ties an order/customer inquiry to a specific admin for handling)
- **Override Production Stage** (super-admin only) — same 6-stage `productionStage` pipeline admins use (design_review → design_approved → printing → quality_check → packed → shipped, per admin spec Section 3.3.3), but with no restriction on reverting stages or skipping the required note — an escalation path for disputes an admin can't resolve alone

**Note:** Regular admins can view/update order status and production stage per their existing permission; refunds, permanent order actions, and unrestricted production-stage overrides stay super-admin-only.

**Filters (added):** Order List filters also include Production Stage (for `tshirts`-category orders) alongside Payment Status and Order Status — lets super-admin spot every order stuck at `printing` or `quality_check` platform-wide, not just per-admin.

**Security Logs:** Event `order_status_updated` / `order_refunded` / `order_production_stage_updated`.

---

### 3.12 — Admin Task Assignment (/superAdmin/admin-management/[adminId]/tasks or /superAdmin/tasks)

**Purpose:** Super-admin assigns work items to specific admins and tracks completion.

**Content:**

- Board or list view, filterable by Admin (dropdown or "All"), Status (Pending/In Progress/Done/Overdue)
- "Assign Task" button

**Create Task Form:**

- Title (text, required)
- Description (textarea)
- Assign to (dropdown of active admins, required)
- Due date (date, required)
- Priority (Low/Medium/High)
- Related record (optional link: order ID, buyer ID, or product ID — see 3.13)

**Row Actions:** Edit, Mark Complete, Reassign, Delete (confirmation modal)

**Admin-side view:** Each admin sees only their own assigned tasks under their dashboard (e.g. `/admin/tasks`) — never other admins' tasks.

**Toast (per Rule 22):** `✓ Task assigned to [admin name].`

**Security Logs:** Event `task_assigned` / `task_reassigned`.

---

### 3.13 — Customer Assignment to Admin (/superAdmin/customer-assignment)

**Purpose:** Super-admin routes a specific buyer/customer or inquiry to a specific admin for ongoing handling (support case, custom order negotiation, VIP account, etc.).

**Content:**

- Table: Buyer/Customer, Reason for assignment, Assigned Admin, Assigned Date, Status (Active/Resolved), Actions
- "Assign Customer" button

**Assign Form:**

- Buyer (searchable dropdown, required)
- Assign to Admin (dropdown of active admins, required)
- Reason/Notes (textarea, optional)
- Status: Active / Resolved

**Effect:** The assigned admin sees this buyer flagged in their own Buyer/Order views (e.g. a "My Assigned Customers" filter) so they know which accounts are theirs to handle.

**Row Actions:** Reassign to a different admin, Mark Resolved, Remove assignment (confirmation modal)

**Security Logs:** Event `customer_assigned` / `customer_reassigned`.

---

### 3.14 — Full-Control Principle

Every capability available to a regular admin (products, orders, buyers, security-log viewing if granted) is also available to super-admin without needing the permission explicitly granted — super-admin's permission set is always the full set (Section 3.2.2 already notes this: "Super-admin has all permissions by default, non-editable"). Sections 3.7–3.13 above are the concrete pages that make this true for content, buyers, announcements, products, orders, task assignment, and customer assignment, on top of the admin-management, security-logs, account-activity, backups, and vault pages already specified in 3.2–3.6.

---

## 4. SECURITY & RESTRICTIONS

### 4.1 — Super-Admin-Only Operations

The following operations **can ONLY be performed by super-admin**, never by regular admin:

- ✓ Create admin accounts
- ✓ Deactivate/reactivate admin accounts
- ✓ Delete admin accounts (permanent)
- ✓ Reset admin passwords (force change)
- ✓ Update admin permissions
- ✓ View security logs (all events)
- ✓ View account activity (all admins + super-admin)
- ✓ View/revoke vault credentials
- ✓ Generate new vault credentials
- ✓ Access platform health dashboard
- ✓ Modify system settings (future)
- ✓ Edit all visitor-facing content (CMS, Section 3.7)
- ✓ Permanently delete buyer accounts (Section 3.8)
- ✓ Publish site-wide announcements (Section 3.9)
- ✓ Issue refunds (Section 3.11)
- ✓ Assign tasks to admins (Section 3.12)
- ✓ Assign customers/orders to a specific admin (Section 3.13)

### 4.2 — Admin-Only Operations

Regular admins can:

- ✓ Manage products (create, edit, delete)
- ✓ Manage orders (view, update status)
- ✓ Manage users (view, deactivate/reactivate buyers, reset buyer passwords)
- ✓ View analytics (permitted data only)
- ✓ View security logs (if permission granted by super-admin)
- ✗ Cannot create other admins
- ✗ Cannot deactivate admins
- ✗ Cannot reset other admin passwords
- ✗ Cannot view vault credentials
- ✗ Cannot modify platform-level settings

### 4.3 — Middleware Enforcement

Middleware.ts enforces:

- Routes starting `/superAdmin` require `role = "superAdmin"` (401 if not met)
- Routes starting `/admin` require `role = "admin" OR "superAdmin"` (401 if not met)
- All other routes (`/buyer`, `/`, `/shop`, etc.) are public or require `role = "buyer"`

### 4.4 — Activity Logging

All super-admin actions are logged in SecurityLog (Rule 38) and AccountActivityLog (Rule 42):

- Admin account creation/deletion
- Permission changes
- Vault credential generation
- Backup restores (if implemented later)

---

## 5. PASSWORD & SESSION MANAGEMENT

### 5.1 — Password Requirements

- Minimum 12 characters (elevated from Rule 34's standard 8 for admin/super-admin)
- Must include: 1 uppercase, 1 lowercase, 1 number, 1 special character
- Cannot reuse last 5 passwords (tracked in DB)
- Must be changed within 90 days (expiry notice sent at day 75)

### 5.2 — Session & Token Security

- Access token: 15 minutes (Rule 32.3)
- Refresh token: 7 days, stored in HttpOnly cookie
- Idle session timeout: 15 minutes (Rule 32.5 — more aggressive than 30-min for regular buyers)
- On logout: Origin-Scoped Session Termination (Rule 44)

### 5.3 — Failed Login Attempts

- Rate limit: 5 attempts per 15 minutes per IP (Rule 32.1)
- After 5 failures: account locked for 1 hour (auto-recovery)
- Super-admin notified of lock (email + dashboard alert)

---

## 6. API ENDPOINTS

### POST /api/admin/create-admin

**Permission:** superAdmin only

**Request:**

```json
{
  "fullName": "Jane Admin",
  "email": "jane.admin@example.com",
  "permissions": ["manage-products", "view-analytics"]
}
```

**Response (success):**

```json
{
  "success": true,
  "data": {
    "adminId": "uuid",
    "email": "jane.admin@example.com",
    "createdAt": "2026-09-01T12:00:00Z"
  },
  "message": "Admin account created. Credentials sent."
}
```

### GET /api/admin/admins

**Permission:** superAdmin only

**Query Params:** page, limit, status, search (email/name)

**Response:**

```json
{
  "success": true,
  "data": {
    "admins": [...],
    "totalCount": 5,
    "totalPages": 1,
    "page": 1
  },
  "message": "Admin list retrieved."
}
```

### PUT /api/admin/admins/[adminId]

**Permission:** superAdmin only

**Request:**

```json
{
  "fullName": "Jane Admin Updated",
  "status": "active",
  "permissions": ["manage-products", "manage-orders", "view-analytics"]
}
```

**Response:**

```json
{
  "success": true,
  "data": { "adminId": "uuid", "email": "jane.admin@example.com" },
  "message": "Admin account updated."
}
```

### DELETE /api/admin/admins/[adminId]

**Permission:** superAdmin only

**Confirmation Required:** Prompt modal with 5-second delay

**Response:**

```json
{
  "success": true,
  "data": null,
  "message": "Admin account deleted permanently."
}
```

### GET /api/admin/security-logs

**Permission:** superAdmin only

**Query Params:** page, limit, eventType, deviceType, country, dateFrom, dateTo

**Response:**

```json
{
  "success": true,
  "data": {
    "logs": [...],
    "totalCount": 342,
    "totalPages": 14,
    "page": 1
  },
  "message": "Security logs retrieved."
}
```

### POST /api/admin/vault/generate

**Permission:** superAdmin only

**Request:**

```json
{
  "reason": "Emergency access",
  "expiresIn": 3600,
  "description": "Backup auth for API migration"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "vaultId": "uuid",
    "secretKey": "a7f2e9c1b4d8a3f5e7c2b9d4a1e8f3c5",
    "expiresAt": "2026-09-01T13:00:00Z"
  },
  "message": "Vault credentials generated."
}
```

---

## 7. VAULT & SESSION SLUG SYSTEM

The Super-Admin account includes an advanced **Vault System** for session management and emergency credential backup.

### 7.1 — Session Slug (Auto-Generated)

**What is it:** A unique, auto-generated session identifier created on first login and persists until sign-out.

**Format (Super-Admin):** 36 components total

- 12 random BIP39 words
- 12 random alphanumeric characters (A-Z, a-z, 0-9)
- 12 random alphaspecialcharacters (!@#$%^&\*-\_+=)

**Lifecycle:**

1. **First Login** → No slug exists → Auto-generate new slug → Stored in AdminSession table
2. **Subsequent Logins** → Slug exists & active → Reuse same slug (do NOT regenerate)
3. **Sign-Out** → Slug marked inactive (isActive = false)
4. **Next Login** → Generate completely NEW slug (never reuse old one)

**Storage:**

```json
{
  "words": ["apple", "beach", "crown", "delta", ...],
  "alphanumeric": "Aa1Bb2Cc3Dd4",
  "alphaspecial": "a!B@c#D$e%F^",
  "isActive": true,
  "generatedAt": "2026-09-03T10:30:00Z"
}
```

**Access:** View slug at `/superAdmin/vault` page

### 7.2 — Vault Credentials (Emergency Access)

**What is it:** Offline emergency backup access codes generated manually within the vault page.

**Format:** 30 components total

- 15 random BIP39 words
- 15 random alphanumeric characters (A-Z, a-z, 0-9)

**How to Generate:**

1. Navigate to `/superAdmin/vault`
2. Click "Generate Emergency Credentials"
3. System displays 15 words + 15 alphanumeric
4. ⚠️ CRITICAL: Copy or screenshot immediately — NOT stored in system
5. Store offline (password manager, encrypted file, paper safe)

**Security Rules:**

- ✅ Plaintext NOT stored in database
- ✅ Only generation timestamp logged for audit
- ✅ Credentials ephemeral — exist only on page load
- ✅ Never retrievable after page close
- ✅ Generated new each time (no caching)

**Use Case:** Emergency offline access if primary authentication fails (FUTURE FEATURE)

### 7.3 — Vault Page (`/superAdmin/vault`)

**Route:** `/superAdmin/vault`

**Access:** Super-admin only (middleware protected)

**Contents:**

- Current session slug (3 components displayed)
- Copy buttons for each component
- "Generate Emergency Credentials" button
- Credentials generator (displays 15 words + 15 alphanumeric, one-time only)
- Warning banner: Store credentials offline, never share, never email unencrypted

**Session Info:**

- Slug status: Active/Inactive
- Generated: [date/time]
- Expires at: Sign-out (no automatic expiry while logged in)
- Next regeneration: On next login

---

## 8. RESTRICTIONS ON REGISTRATION & ACCOUNT CREATION

**CRITICAL PRINCIPLE:** Super-admin accounts are NEVER created via public registration form.

| Account Type    | Creation Method                                                                 | Registration Available?                                | Who Can Create?                       |
| --------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------- |
| **Buyer**       | Public registration form at `/auth/login` (tab: "Create Account")               | ✅ YES — anyone can self-register                      | User themselves                       |
| **Admin**       | Manual creation via super-admin dashboard (/superAdmin/admin-management/create) | ❌ NO — no public registration                         | Super-admin only                      |
| **Super-Admin** | Manual creation via Supabase console (platform setup only)                      | ❌ NO — no public registration, no self-serve creation | Platform owner (during initial setup) |

**Why this structure:**

- Buyers register themselves (self-service, frictionless)
- Admins are vetted and created by super-admin (controlled, audited)
- Super-admin is one-time, platform-level setup (highest security)

---

## 9. RECOMMENDED IMPROVEMENTS & HARDENING (STATUS: PROPOSED — NOT YET BUILT)

These are gaps identified on review of Sections 1–8. None of these have been implemented yet; each needs its own build pass.

### 9.1 — Security

- **2FA/MFA on super-admin login.** TOTP (authenticator app) required in addition to password before reaching `/superAdmin/*`. Password alone is not enough for the highest-privilege account.
- **IP allowlist / stricter geo response.** Rule 38 already logs `location_anomaly`, but for super-admin specifically, an anomaly should be able to block the session (not just log it) until confirmed via a second channel (email link or TOTP re-entry) — configurable allowlist of known IPs/VPN ranges is the stronger version of this.
- **Super-admin break-glass recovery.** Documented procedure for when the platform owner loses access to both password and 2FA device (e.g. a pre-registered recovery email + identity-verification step + manual Supabase console reset by a secondary trusted contact). Currently undocumented.

### 9.2 — Product & Order Workflow

- **Product approval flow.** When a regular admin creates/edits a product, it saves as `status: "pending-review"` instead of going live immediately. Super-admin approves or rejects from `/superAdmin/products` (filter: Pending Review). Keeps the Section 3.14 full-control principle meaningful — nothing goes live without super-admin's implicit or explicit sign-off.
- **Customer Assignment exclusivity check.** Before assigning a buyer to an admin (Section 3.13), check if that buyer already has an active assignment to a different admin. If so, show a warning and require either "Reassign (unassigns the previous admin)" or "Cancel" — never silently allow two active assignments on the same buyer.
- **Task notifications + overdue escalation.** When a task is assigned (Section 3.12), the admin gets an email + in-app toast/notification (not just a row appearing in their list). If a task passes its due date unresolved, super-admin gets an escalation notice (dashboard alert + email).

### 9.3 — Content/CMS

- **Version history beyond 1 revert.** Section 3.7's "revert to last published" keeps only 1 prior version. Raise to a timestamped history (e.g. last 5 versions per section) so a bad edit from several saves ago can still be recovered.
- **Media/asset library.** A `/superAdmin/media` page listing everything already uploaded to Cloudflare R2 (Rule 35.6), with search/filter and a "copy URL" / "insert into CMS field" action — avoids re-uploading the same image for multiple products or content sections.

### 9.4 — Visibility & Team Management

- **Scoped-by-default admin views.** Regular admins see only their own assigned tasks (Section 3.12) and assigned customers (Section 3.13) by default when they open Orders/Buyers — a toggle or filter lets super-admin (and only super-admin) view "All admins" instead of one admin's own scope.
- **In-app notification center.** A bell icon in the super-admin (and admin) header showing unread events relevant to that account — task assigned to you, customer assigned to you, product pending your approval — distinct from the full Security/Account Activity logs, which stay as the audit trail rather than the alert mechanism.

### 9.5 — Analytics & Reporting

- **Full Analytics page.** Expand the Dashboard's 3-number "Analytics Summary" (Section 3.1) into a dedicated `/superAdmin/analytics` page: traffic trends (Rule 41's aggregate page-view data), revenue-over-time chart, top products, top referrers.
- **Per-buyer data export.** From a buyer's detail view (Section 3.8), a "Export buyer data" action (orders, account info, activity) — useful for support requests or a data-access request from the buyer.

### 9.6 — Backup & Recovery

- **Documented restore procedure.** The Backups page (Section 3.5) is read-only by design (Rule 40.6) — but the spec should still document, as an operational runbook (not a UI feature), the exact steps to restore from a Google Drive/R2 snapshot or Supabase PITR if the platform owner ever needs to, referencing Rule 40's backup architecture.

---

## 10. TESTING & VERIFICATION CHECKLIST

- [ ] Super-admin can log in at `/auth/login`
- [ ] Super-admin is redirected to `/superAdmin/dashboard` after login
- [ ] Regular buyers cannot access `/superAdmin/*` routes (401 redirect to login)
- [ ] Regular admins cannot access super-admin-only pages (e.g., `/superAdmin/vault`)
- [ ] Super-admin can create admin accounts via `/superAdmin/admin-management/create`
- [ ] New admin receives email with temporary password
- [ ] Admin cannot be created without unique email (API validation)
- [ ] Super-admin can deactivate/reactivate admin accounts
- [ ] Super-admin can reset admin passwords (email sent)
- [ ] Super-admin can delete admin accounts (5-second confirmation delay)
- [ ] Security logs are populated with all super-admin actions
- [ ] Vault credentials are generated, displayed, and can be revoked
- [ ] Session timeout after 15 minutes of inactivity (auto-logout, toast notification)
- [ ] Password change required within 90 days (reminder email at day 75)
- [ ] Failed login attempts locked account after 5 failures (1-hour lockout)
- [ ] All tests pass with `npx tsc --noEmit`
- [ ] (Proposed, Section 9) Super-admin login requires 2FA/TOTP in addition to password
- [ ] (Proposed, Section 9) Location anomaly on super-admin login blocks session pending second-channel confirmation
- [ ] (Proposed, Section 9) Admin-created/edited products save as pending-review, not live, until super-admin approves
- [ ] (Proposed, Section 9) Assigning an already-assigned buyer to a new admin shows a reassignment warning
- [ ] (Proposed, Section 9) Task assignment triggers email + in-app notification to the assigned admin
- [ ] (Proposed, Section 9) Overdue task triggers escalation alert to super-admin
- [ ] (Proposed, Section 9) CMS section history keeps at least 5 prior versions, not just 1
- [ ] (Proposed, Section 9) Media library page lists all Cloudflare R2 uploads with copy/reuse action
- [ ] (Proposed, Section 9) Admin views (Orders/Buyers) default to "my assigned only" with a super-admin-only "view all" toggle
- [ ] (Proposed, Section 9) In-app notification bell shows unread task/assignment/approval events
- [ ] (Proposed, Section 9) `/superAdmin/analytics` page shows traffic trend, revenue-over-time, top products/referrers
- [ ] (Proposed, Section 9) Buyer detail view has an "Export buyer data" action
- [ ] (Proposed, Section 9) Backup restore runbook is documented (steps, not a UI feature)

---

## 11. CHANGE LOG

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-03 | Added Section 12: Implementation Plan (Phased) — 10-phase, dependency-ordered build sequence covering every page/feature in Sections 3, 7, and 9 (auth/2FA foundation, dashboard + logging, admin management, vault/backups, buyer management, product/order management with approval flow, CMS/announcements/media, task/customer assignment with notifications, analytics, remaining hardening), each with scope, deliverables, and acceptance criteria.                                                                         |
| 2026-09-03 | Added Section 9: Recommended Improvements & Hardening (proposed, not yet built) — 2FA/MFA, IP allowlist/anomaly-blocking, break-glass recovery, product approval flow, customer-assignment exclusivity check, task notifications/escalation, CMS multi-version history, media library, scoped-by-default admin views, in-app notification center, full Analytics page, per-buyer data export, backup restore runbook. Renumbered Testing checklist to Section 10 and Change Log to Section 11, and added matching checklist items. |
| 2026-09-03 | Added Sections 3.7–3.14: Content Management/CMS, Buyer Management, Announcements, Product Management, Order Management, Admin Task Assignment, Customer Assignment to Admin, and the Full-Control Principle — super-admin can now manage all visitor content, buyers, products, orders, and admin work assignment, on top of the existing admin-management/security/vault pages. Updated Section 4.1's super-admin-only operations list to match.                                                                                  |
| 2026-09-04 | Section 3.10's product Media field expanded from single image to Cover Image + up to 8 Gallery Images + optional Preview Video, per new `product_media_upload_specification.md` — all stored in Cloudflare R2, same component shared with `/admin/products`.                                                                                                                                                                                                                                                                       |
| 2026-09-04 | Added "Manage Device Bans" quick action link to the dashboard, and folded the new `gatekeeper_specification.md` (device-fingerprint-based ban system, all account types + pre-auth traffic, permanent ban until manual super-admin unban) into Phase 2's scope/deliverables/acceptance criteria, since it depends directly on the `SecurityLog` infrastructure built in that same phase.                                                                                                                                           |
| 2026-09-04 | Updated Section 3.11 Order Management: added super-admin-only unrestricted Production Stage override, Production Stage filter on the order list, and `order_production_stage_updated` security event. Updated Phase 6 scope/deliverables/acceptance to include the shared `productionStage` pipeline (admin spec Section 3.3.3) and the new companion `buyer_order_tracking_specification.md`.                                                                                                                                     |
| 2026-09-03 | Added Section 7: Vault & Session Slug System — super-admin slug format (12 words + 12 alphanumeric + 12 alphaspecial), auto-generation on first login, slug reuse on subsequent logins, new slug on sign-out + next login. Added vault credentials (15 words + 15 alphanumeric) for emergency access.                                                                                                                                                                                                                              |
| 2026-09-01 | Initial super-admin specification created; account creation, dashboard, admin management, security logs sections documented.                                                                                                                                                                                                                                                                                                                                                                                                       |

---

## 12. IMPLEMENTATION PLAN (PHASED)

Order is dependency-driven, not priority-driven — each phase below only depends on phases listed before it, so building in this order never leaves a page half-functional waiting on something not built yet. Every "Scope" line references the section that already specifies the feature in detail; this section adds sequencing, deliverables, and per-phase acceptance criteria on top.

### Phase summary

| Phase | Focus                                               | Depends on    |
| ----- | --------------------------------------------------- | ------------- |
| 1     | Foundation, auth, session security, 2FA             | —             |
| 2     | Dashboard shell + security/activity logging         | Phase 1       |
| 3     | Admin management                                    | Phase 1, 2    |
| 4     | Vault & backups                                     | Phase 1, 2    |
| 5     | Buyer management                                    | Phase 1, 2, 3 |
| 6     | Product & order management (with approval flow)     | Phase 1, 2, 3 |
| 7     | Content management (CMS), announcements, media lib  | Phase 1, 2    |
| 8     | Task assignment, customer assignment, notifications | Phase 3, 5, 6 |
| 9     | Analytics & reporting                               | Phase 2, 5, 6 |
| 10    | Remaining hardening (IP allowlist, leftovers)       | Phase 1       |

---

### Phase 1 — Foundation, Auth & Session Security

**Goal:** nothing else in this spec works without this — build first.

**Scope:**

- Section 2 in full: Supabase account init, shared `/auth/login` route, `middleware.ts` role check, HttpOnly session cookie, refresh token rotation (Rule 32.3)
- Section 5: password policy (12+ chars, complexity, 90-day expiry reminder, last-5-reuse block), rate limiting (5 attempts/15 min), account lockout (1 hour)
- Section 9.1: 2FA/TOTP enrollment + verification — built here since it changes the login flow itself, not bolted on later
- Section 44: origin-scoped logout (`Clear-Site-Data` + HttpOnly cookie expiry)

**Deliverables:** working `/auth/login`, `middleware.ts`, session + refresh cookie flow, TOTP enrollment screen and verification step, lockout logic, logout endpoint.

**Acceptance:** super-admin logs in with password + TOTP and lands on `/superAdmin/dashboard`; a buyer or no-role session gets 401 on any `/superAdmin/*` route; 5 failed attempts locks the account for 1 hour; logout clears the session cookie and fires `Clear-Site-Data`.

---

### Phase 2 — Dashboard Shell + Security/Activity Logging Infrastructure

**Goal:** every later feature needs a place to log to and a shell to render inside — build the plumbing once, here.

**Scope:**

- Section 3.1: Dashboard Home (health widget, recent activity, quick actions, analytics summary — can start as a stub, filled in by later phases)
- Rule 38: `SecurityLog` model, `logSecurityEvent()` service, device fingerprinting, geolocation, anomaly detection
- Rule 42: `AccountActivityLog` model, `recordAccountActivity()` service
- Section 3.3 Security Logs page and Section 3.4 Account Activity page — read-only viewers on top of the models above
- Section 9.1: anomaly-blocking (a `location_anomaly` event blocks the session pending a second-channel confirmation, not just logs it)
- `gatekeeper_specification.md` in full: `DeviceBan` model, Gatekeeper Fingerprint check in `middleware.ts` (applies to every account type + pre-auth login/register), instant-ban and 3-strike breach logic, `/superAdmin/gatekeeper` page — depends directly on `SecurityLog` existing, so it belongs in this phase alongside it, not later

**Deliverables:** `SecurityLog` + `AccountActivityLog` + `DeviceBan` tables, shared logging helpers, 4 pages (dashboard shell, security logs, account activity, gatekeeper/device bans), Gatekeeper check wired into `middleware.ts`.

**Acceptance:** every login attempt from Phase 1 appears in Security Logs within this phase; the dashboard renders real counts instead of placeholders; an impossible-travel login is blocked, not just logged; a device that trips `sql_injection_attempt` or `location_anomaly` is immediately blocked platform-wide on its next request; a device is banned automatically after 3 `login_failed`/`admin_login_denied`/`registration_abuse`/`rate_limit_hit` events within 24h; only a super-admin can unban, and only with a note.

---

### Phase 3 — Admin Management

**Goal:** super-admin's first real administrative power — creates the team the rest of the system is built for.

**Scope:** Section 3.2 in full (admin list, create, edit/deactivate/delete), Section 6's admin API endpoints, permission-checkbox groundwork (stored now, enforced per-feature as each feature is built in later phases).

**Deliverables:** `/superAdmin/admin-management/*` pages and API routes.

**Acceptance:** super-admin creates an admin who receives a temp-password email, logs in successfully, and is correctly blocked by middleware from every super-admin-only route.

---

### Phase 4 — Vault & Backups

**Goal:** the emergency-access and disaster-recovery layer — built early so it's protecting the system by the time there's real data worth protecting.

**Scope:** Section 7 (session slug + vault credentials), Section 3.6 Vault page, Section 3.5 Backups page (read-only viewer), Rule 40's backup script + `BackupLog` model, Section 9.1's break-glass recovery runbook, Section 9.6's restore runbook.

**Deliverables:** vault generate/revoke flow, session slug lifecycle, scheduled backup script wired to the Backups page, written recovery and restore runbooks (docs, not UI).

**Acceptance:** a generated vault credential is shown once and is unrecoverable after the page closes; the nightly backup job produces a `BackupLog` row; both runbooks exist as reviewable documents.

---

### Phase 5 — Buyer Management

**Goal:** extend the same list/detail/action pattern from Phase 3 to buyer accounts, which already exist from Day 1 public registration.

**Scope:** Section 3.8 in full (list, deactivate/reactivate, reset password, permanent delete).

**Deliverables:** `/superAdmin/buyer-management/*` pages and API routes.

**Acceptance:** deactivating a buyer immediately blocks that buyer's login; permanent delete requires the 5-second confirmation delay.

---

### Phase 6 — Product & Order Management (with Approval Flow)

**Goal:** the platform's actual commerce content — high business value, but sequenced after Phase 3 so admin permissions can gate it correctly from day one.

**Scope:** Section 3.10 Product Management, Section 3.11 Order Management (including the `productionStage` override for `tshirts`-category orders), Section 9.2's product approval flow (`pending-review` status, super-admin approve/reject), Rule 30's PayMongo payment capture pattern wired into the Order Management refund action, admin spec Section 3.3.3's production-stage pipeline (built once, shared by admin and super-admin views), and the companion buyer-facing read-only tracker in `buyer_order_tracking_specification.md`.

**Deliverables:** `/superAdmin/products/*`, `/superAdmin/orders/*`, a Pending Review filter with approve/reject actions, a refund action wired to PayMongo, the shared `productionStage` field + stepper component (used by admin, super-admin, and buyer views), `/buyer/orders` and `/buyer/orders/[orderId]`.

**Acceptance:** a product created by a regular admin shows as pending-review and is invisible on the storefront until super-admin approves it; issuing a refund updates the order's status and payment record; advancing a t-shirt order's production stage as an admin is immediately visible on the buyer's tracking page and in super-admin's order list filter.

---

### Phase 7 — Content Management (CMS), Announcements, Media Library

**Goal:** move visitor-facing content off static `lib/*Data.ts` files and onto a super-admin-editable DB — grouped with announcements and the media library since all three share the same publish/preview pattern. Independent of Phases 3–6, so it can be built in parallel with them if needed.

**Scope:** Section 3.7 CMS (all listed sections), Section 3.9 Announcements, Section 9.3 (media library + multi-version history, raised from 1 to 5 versions).

**Deliverables:** `/superAdmin/content/*`, `/superAdmin/announcements/*`, `/superAdmin/media`, a DB migration moving static data into content tables, a version-history table.

**Acceptance:** editing the homepage hero in the CMS and publishing updates the live homepage with no deploy; reverting can pick any of the last 5 versions, not just the immediately prior one.

---

### Phase 8 — Task Assignment, Customer Assignment & Notifications

**Goal:** the internal workflow layer tying admins to the work created in Phases 3–6 — needs admins, buyers, and orders/products to already exist so there's something to assign.

**Scope:** Section 3.12 Task Assignment, Section 3.13 Customer Assignment, Section 9.2's task notifications + overdue escalation + assignment-exclusivity check, Section 9.4's scoped-by-default admin views and in-app notification bell.

**Deliverables:** `/superAdmin/tasks` (or nested under admin-management), `/superAdmin/customer-assignment`, a notification bell component with an unread-count API, email notification on assignment.

**Acceptance:** assigning a task emails the admin and appears in their notification bell; assigning an already-assigned buyer shows the reassignment warning instead of silently double-assigning; an admin's own Orders/Buyers view defaults to "mine only" with a super-admin-only "view all" toggle.

---

### Phase 9 — Analytics & Reporting

**Goal:** built last since it reports on data generated by every earlier phase — the further along the other phases are, the more meaningful this one is.

**Scope:** Section 9.5's full `/superAdmin/analytics` page (traffic trend, revenue-over-time, top products/referrers), Rule 41's aggregate `PageViewDaily` table, the per-buyer data export action.

**Deliverables:** `/superAdmin/analytics`, a `PageViewDaily` aggregation job, a CSV/JSON export endpoint for a single buyer's data.

**Acceptance:** the analytics page shows real traffic and revenue trend lines (not placeholder numbers); exporting a buyer produces a downloadable file containing their orders and activity.

---

### Phase 10 — Remaining Hardening

**Goal:** sweep up anything from Section 9 not already folded into an earlier phase.

**Scope:** Section 9.1's IP allowlist (if not already done alongside Phase 1's 2FA work), any other Section 9 item not explicitly placed in Phases 1–9.

**Deliverables:** IP allowlist configuration and enforcement in `middleware.ts`.

**Acceptance:** a login attempt from outside the configured allowlist (when one is set) is blocked or requires extra verification.

---

**Document Version:** 1.6  
**Last Updated:** 2026-09-04  
**Status:** Specification Complete — Section 9 items proposed pending build; Section 12 is the build sequence for Sections 3, 7, and 9 combined
