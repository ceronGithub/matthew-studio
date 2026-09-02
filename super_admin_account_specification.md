# Super-Admin Account — Feature Specification Document

## 1. PURPOSE & OVERVIEW

The **Super-Admin Account** is a privileged administrative role with the highest level of access to the Matthew Studio platform. The super-admin account is responsible for:

- System configuration and platform-wide settings
- Creation and management of admin accounts
- Access to the admin vault (emergency credentials)
- Full audit and security log access
- Platform health and analytics dashboard

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

## 9. TESTING & VERIFICATION CHECKLIST

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

---

## 10. CHANGE LOG

| Date       | Change                                                                                                                                                                                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-03 | Added Section 7: Vault & Session Slug System — super-admin slug format (12 words + 12 alphanumeric + 12 alphaspecial), auto-generation on first login, slug reuse on subsequent logins, new slug on sign-out + next login. Added vault credentials (15 words + 15 alphanumeric) for emergency access. |
| 2026-09-01 | Initial super-admin specification created; account creation, dashboard, admin management, security logs sections documented.                                                                                                                                                                          |

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-01  
**Status:** Specification Complete
