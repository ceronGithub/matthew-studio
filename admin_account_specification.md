# Admin Account — Feature Specification Document

## 1. PURPOSE & OVERVIEW

The **Admin Account** is a privileged but restricted administrative role. Admins perform day-to-day operational tasks such as managing products, orders, and users, but have **NO authority to create other admin accounts, access emergency credentials, or modify platform settings**.

**Target Users:** Operations managers, content managers, customer support representatives

**Key Principle:** Admins operate under the principle of "least privilege" — they have only the permissions granted by the super-admin, and cannot escalate their own permissions or create peer/subordinate accounts.

---

## 2. ACCOUNT CREATION & AUTHENTICATION

### 2.1 — Account Creation Process

**CRITICAL:** Admin accounts are **NEVER created via public registration**. Registration is ONLY for buyer accounts.

**Admin Account Creation (Super-Admin Only):**

1. **Super-admin navigates to:** `/superAdmin/admin-management/create`
2. **Super-admin fills form:**
   - Full Name
   - Email (must be unique)
   - Permissions (checkbox group, selected by super-admin)
3. **Backend creates Supabase user:**
   - Email + temporary password
   - Role in `user_metadata`: `"role": "admin"`
   - Permissions stored in `user_metadata.permissions` array
   - Example:
     ```json
     {
       "role": "admin",
       "permissions": ["manage-products", "manage-orders", "view-analytics"]
     }
     ```
4. **Email sent to new admin:**
   - Login URL: `/auth/login`
   - Email: [new admin email]
   - Temporary password: [16-char auto-generated]
   - Note: "You must change this password on first login"
5. **Super-admin sees confirmation:** Toast: ✓ "Admin account created. Credentials sent to [email]."

**NO SELF-SERVICE:** Admin cannot be created by:

- ❌ Public registration form
- ❌ Another admin (even if admin has "create admin" permission)
- ❌ Admin themselves
- ✅ **ONLY** super-admin can create new admins

---

### 2.2 — Admin Login

- **Route:** `/auth/login` (shared with buyer/super-admin)
- **Process:**
  1. Enter email + password
  2. Supabase authenticates against `auth.users` table
  3. Check `user_metadata.role` in JWT token
  4. If role = "admin" → check middleware.ts
  5. If authorized for requested route → redirect to dashboard or requested page
  6. If not authorized → reject with "Unauthorized" (401)

- **Session Token:**
  - HttpOnly cookie (name: `session`, maxAge: 7 days)
  - Contains JWT with role claim + permissions array
  - Refresh token rotated every 24 hours (Rule 32.3)

### 2.3 — Middleware Protection (middleware.ts)

```typescript
if (pathname.startsWith("/admin")) {
  const userRole = request.auth?.user?.user_metadata?.role;
  if (!["admin", "superAdmin"].includes(userRole)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Optional: permission-level checks per route
  // e.g., if pathname includes "/admin/settings" and
  // admin doesn't have "manage-settings" permission → 403
}
```

**Result:** Only authenticated users with `role = "admin"` OR `role = "superAdmin"` can access `/admin/*` routes.

---

## 3. ADMIN DASHBOARD & PAGES

### 3.1 — Dashboard Home (/admin/dashboard)

**Purpose:** Daily operations hub for the admin

**Sections:**

1. **Recent Activity**
   - Last 10 orders (status, customer, amount, created date)
   - Last 5 products added/modified
   - Filter by date range

2. **Quick Stats (Read-Only)**
   - Total products
   - Total orders (last 7 days)
   - Total revenue (last 7 days)
   - Pending orders (status = "pending")
   - Average order value

3. **Quick Actions (Cards)**
   - "Add New Product" → `/admin/products/create`
   - "Manage Orders" → `/admin/orders`
   - "Manage Users" → `/admin/users`
   - "View Analytics" (if permission granted)

4. **Alerts**
   - ⚠️ Low inventory products (if inventory feature exists)
   - ⚠️ Pending orders needing action
   - ℹ️ Scheduled promotions expiring soon

---

### 3.2 — Product Management (/admin/products)

#### 3.2.1 — Product List Page

**Purpose:** View and manage all marketplace products

**Content:**

- Paginated table (25 per page, newest first)
- Columns: Product Name, Category, Price, Stock (if applicable), Status (Published/Draft), Created Date, Actions
- Filters: Category, Status, Date Range, Search by name
- Export: CSV

**Row Actions:**

- **Edit** → `/admin/products/[productId]/edit`
- **View** → `/admin/products/[productId]` (read-only preview)
- **Delete** → Modal confirmation (soft delete, set `deletedAt`)
- **Duplicate** → Create a copy with "-copy" suffix

**Bulk Actions (if checked):**

- Publish / Unpublish
- Delete selected
- Change category

---

#### 3.2.2 — Create/Edit Product (/admin/products/create, /admin/products/[productId]/edit)

**Purpose:** Add or modify product details

**Form Fields:**

- **Product Name** (text, required, max 100 chars)
- **Category** (dropdown, required, options: Templates, T-Shirts, AI Videos, File Tools, Tutorials, Game Characters)
- **Description** (textarea, required, max 1000 chars)
- **Price** (number, required, min 0.01)
- **Stock** (number, optional, if inventory system exists)
- **Status** (radio: Draft / Published, required)
- **Image/Thumbnail** (file upload, optional, max 5MB)
  - Uploading triggers `POST /api/upload` (Cloudflare R2, Rule 35.6)
  - Replaces existing image if update
- **Tags** (comma-separated text, optional, for search)
- **Featured** (checkbox, optional, marks as featured product)

**Process:**

1. Admin fills form and clicks "Save Product"
2. Frontend validation (required fields, constraints)
3. Backend validation: unique name (per category), valid category, price > 0
4. If new product: INSERT into `products` table, set `createdBy = admin.email`, `createdAt = now()`
5. If update: UPDATE `products` table, set `updatedBy = admin.email`, `updatedAt = now()`
6. Toast: ✓ "Product saved successfully."
7. Redirect to product list or back to edit page (per admin preference)

**Security:**

- Admin can only edit/delete products they created OR products without an owner
- Audit trail: all changes logged to Rule 6's audit table (who edited what, when)

---

### 3.3 — Order Management (/admin/orders)

#### 3.3.1 — Order List Page

**Purpose:** View and manage buyer orders

**Content:**

- Paginated table (25 per page, newest first)
- Columns: Order ID, Buyer Email, Total, Status (badge), Created Date, Actions
- Filters: Status (Pending/Confirmed/Shipped/Delivered/Cancelled), Date Range, Search by order ID or email
- Export: CSV

**Status Badges:**

- 🟠 Pending — awaiting confirmation
- 🟡 Confirmed — ready to ship
- 🟢 Shipped — en route
- 🔵 Delivered — completed
- 🔴 Cancelled — refunded or cancelled

**Row Actions:**

- **View Details** → `/admin/orders/[orderId]`
- **Update Status** → Modal dropdown, select new status, add note, confirm
- **Send Email** → Modal, compose custom email to buyer (with preset templates)
- **Refund** → Modal confirmation, mark refunded, trigger notification

**Bulk Actions (if checked) — RECOMMENDED ENHANCEMENT:**

- Update status for selected orders (single modal, applies to all checked rows)
- Export selected to CSV
- _Added for parity with Product List's bulk actions (3.2.1) — processing daily order batches one-by-one doesn't scale for an ops admin._

---

#### 3.3.2 — Order Details (/admin/orders/[orderId])

**Purpose:** View full order details and manage fulfillment

**Display Sections:**

1. **Order Header**
   - Order ID, created date, last updated
   - Current status (badge)

2. **Buyer Information**
   - Name, email, phone (if available)
   - Account created date

3. **Items in Order**
   - Table: Product Name, Category, Price, Quantity, Subtotal
   - Total row: Order Total

4. **Payment Information**
   - Method (e.g., PayMongo)
   - Payment status (Paid / Pending / Failed)
   - Transaction ID

5. **Timeline**
   - Created → [date]
   - Confirmed → [date]
   - Shipped → [date] (once marked)
   - Delivered → [date] (once marked)

**Actions:**

- **Update Status** dropdown (Pending → Confirmed → Shipped → Delivered)
- **Send Tracking Email** button (pre-filled template for shipped status)
- **Issue Refund** button (confirmation modal, refund reason dropdown)
- **Add Note** (internal note, visible to other admins, not shown to buyer)

---

### 3.4 — User Management (/admin/users)

#### 3.4.1 — Buyer List Page

**Purpose:** View and manage buyer accounts

**Content:**

- Paginated table (25 per page, newest first)
- Columns: Email, Name, Account Created, Last Login, Status (Active/Inactive), Total Orders, Lifetime Value, Actions
- Filters: Status, Date Range, Search by email/name
- Export: CSV

**Row Actions:**

- **View Details** → `/admin/users/[buyerId]`
- **Deactivate/Reactivate** → Toggle status (confirmation modal required)
- **Reset Password** → Send password reset email (confirmation modal)
- **Send Email** → Modal, compose and send to buyer

**Bulk Actions (if checked) — RECOMMENDED ENHANCEMENT:**

- Deactivate/Reactivate selected accounts
- Export selected to CSV
- _Added for parity with Product List's bulk actions (3.2.1)._

---

#### 3.4.2 — Buyer Details (/admin/users/[buyerId])

**Purpose:** View buyer profile and manage account

**Display Sections:**

1. **Account Information**
   - Email, name, phone, account created date
   - Last login date/time + IP + location (city-level)
   - Account status (Active / Inactive)

2. **Order History**
   - Table: Order ID, Date, Total, Status (5 most recent)
   - Link: "View All Orders" → filtered orders list

3. **Account Activity**
   - Last 10 activities (logins, purchases, etc.)

**Actions:**

- **Reset Password** button (send email with reset link)
- **Deactivate Account** button (red, confirmation modal)
- **Send Custom Email** button (modal, compose message)
- **Add Internal Note** (optional, visible to other admins)

---

### 3.5 — Analytics Dashboard (/admin/analytics)

**Availability:** Only if admin has `view-analytics` permission

**Sections:**

1. **Time Series Charts**
   - Orders over time (daily/weekly/monthly)
   - Revenue over time
   - New buyers over time
   - Switchable chart type (line/bar)

2. **Category Breakdown**
   - Revenue by category (pie chart)
   - Orders by category (bar chart)
   - Product popularity (top 10 products, bar chart)

3. **Buyer Metrics**
   - Total buyers (lifetime)
   - New buyers (last 7/30 days)
   - Repeat buyer rate
   - Average order value
   - Lifetime customer value

4. **Filters (Sticky)**
   - Date range picker (preset: Today, Last 7 Days, Last 30 Days, Custom)
   - Category filter (multi-select)

---

### 3.6 — Security Logs (/admin/security-logs)

**Availability:** Only if admin has `view-security-logs` permission (granted by super-admin)

**Purpose:** Let a permitted admin monitor login/security events relevant to their own scope, without exposing platform-wide or other-admin data (Rule 38, scoped down from the super-admin view).

**Content:**

- Paginated DataTable (25 per page, newest first) — same visual pattern as super-admin's Security Logs page (Rule 38.9)
- Columns: Event Type (badge), Device/Location, IP, Timestamp
- Expandable rows: device fingerprint, geolocation (city-level), browser/OS

**Filters:**

- Event type (login_success, login_failed, rate_limit_hit — admin-relevant events only)
- Date range

**Scope restrictions (enforced server-side, never just hidden in the UI):**

- Admins can view: **only their own** login attempts and security events
- Admins CANNOT view: vault credentials, other admins' or super-admin's events, platform-level events (`sql_injection_attempt`, `location_anomaly` on other accounts, etc.)
- API must filter `WHERE actor = currentAdmin.email` — never rely on frontend filtering alone

---

### 3.7 — Account Activity Log (/admin/account-activity)

**Purpose:** Lets the admin review their own navigation and action history (Rule 42) — for self-audit and to confirm nothing unexpected happened on their account.

**Availability:** All admins, no special permission required (this is the admin's own data).

**Content:**

- Paginated DataTable (25 per page, newest first)
- Columns: Action (page visited OR discrete action, e.g. "product_updated"), IP, Device, When
- Expandable rows: full user-agent, geolocation (city-level)

**Filters:**

- Action type (page visit, product-updated, order-refunded, etc.)
- Date range

**Scope restrictions:**

- Always filtered to `WHERE accountId = currentAdmin.id` — an admin can never see another admin's or the super-admin's activity trail (super-admin's `/superAdmin/account-activity` page is the only place that cross-account view exists)

---

### 3.8 — My Profile & Account Settings (/admin/profile) — RECOMMENDED ENHANCEMENT

**Why this is being added:** Neither spec previously gave the admin a self-service way to update their own name, avatar, or password — every change required emailing the super-admin or using the "Reset Password" email flow. A basic profile/settings page is standard for any admin-facing dashboard and reduces avoidable super-admin workload.

**Purpose:** Let the admin manage their own account details without super-admin involvement.

**Display Sections:**

1. **Profile Information**
   - Full name (editable)
   - Email (read-only — changing email requires super-admin action, since it's the login identifier)
   - Avatar/photo upload (optional, max 5MB, uploaded via `POST /api/upload` per Rule 35.6)
   - Role badge (read-only: "Admin")
   - Permissions list (read-only — view only, editing permissions is super-admin-only per Rule 4.2)

2. **Change Password**
   - Current password (required)
   - New password (required, must meet Rule 5.1's 12-char/complexity policy)
   - Confirm new password (required, must match)
   - "Update Password" button (disabled during submission)
   - On success: toast ✓ "Password updated successfully." + forces re-login on other active sessions (Rule 44's origin-scoped termination applied to all other sessions, current session stays active)

3. **Notification Preferences**
   - Toggle: Email me when a new order is placed
   - Toggle: Email me when inventory/stock is low (if inventory feature exists)
   - Toggle: Email me a weekly activity summary
   - Saved immediately on toggle (no separate "Save" button), each toggle fires its own toast

**Actions:**

- "Save Profile" button (name/avatar changes, disabled during submission)
- "Update Password" button (separate form, see above)

**Security:**

- Changing password requires current password re-entry — never allow password change from a stale/unverified session
- Avatar upload follows the same validation as product images (Rule 35.6: type/size checks, processed through `processImage()`, stored in Cloudflare R2 under `avatars/`)
- All profile changes logged to Rule 42's Account Activity Log (`action: "profile_updated"`)

---

## 4. ADMIN PERMISSIONS & ACCESS CONTROL

### 4.1 — Available Permissions (Set by Super-Admin)

Each admin can be granted any combination of the following permissions:

| Permission           | Description                                         | Page Access                  |
| -------------------- | --------------------------------------------------- | ---------------------------- |
| `manage-products`    | Create, edit, delete products                       | `/admin/products`            |
| `manage-orders`      | View, update, refund orders                         | `/admin/orders`              |
| `manage-users`       | View, deactivate/reactivate buyers, reset passwords | `/admin/users`               |
| `view-analytics`     | Access analytics dashboard                          | `/admin/analytics`           |
| `view-security-logs` | Access security logs (non-sensitive events)         | `/admin/security-logs`       |
| `manage-promotions`  | Create, edit, delete promotions/discounts           | `/admin/promotions` (future) |

### 4.2 — What Admins CANNOT Do (Restrictions)

The following are **super-admin only**, never available to regular admins:

| Restricted Action                      | Why                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------- |
| Create other admin accounts            | Security — admins cannot grant themselves peers                         |
| Deactivate other admin accounts        | Prevents unauthorized account lockouts                                  |
| Delete other admin accounts            | Prevents unauthorized deletion of peer accounts                         |
| Reset other admin passwords            | Prevents hijacking of peer accounts                                     |
| Update admin permissions               | Prevents privilege escalation                                           |
| Access vault / emergency credentials   | Requires highest-level trust                                            |
| View platform health / backups         | Platform-level monitoring, not operational                              |
| Modify system settings                 | Prevents configuration tampering                                        |
| View super-admin actions in audit logs | Separation of concerns — super-admin actions hidden from regular admins |

### 4.3 — Permission Enforcement (Backend)

Every API endpoint checks permissions before executing:

```typescript
// Example: DELETE /api/admin/products/[productId]
async function deleteProduct(productId, adminId) {
  const admin = await getAdminWithPermissions(adminId);

  if (!admin.permissions.includes("manage-products")) {
    throw new UnauthorizedError(
      "You don't have permission to delete products.",
    );
  }

  // Proceed with delete...
}
```

---

## 5. PASSWORD & SESSION MANAGEMENT

### 5.1 — Password Requirements

- Minimum 12 characters (elevated from standard for admin/super-admin roles)
- Must include: 1 uppercase, 1 lowercase, 1 number, 1 special character
- Cannot reuse last 5 passwords
- Must be changed within 90 days (reminder email at day 75)
- First login must change temporary password (enforced before dashboard access)

### 5.2 — Session & Token Security

- Access token: 15 minutes (Rule 32.3 — more aggressive than 30-min for buyers)
- Refresh token: 7 days, stored in HttpOnly cookie
- Idle session timeout: 15 minutes (Rule 32.5 — auto-logout after 15 min no activity)
- On logout: Origin-Scoped Session Termination (Rule 44)

### 5.3 — Failed Login Attempts

- Rate limit: 5 attempts per 15 minutes per IP (Rule 32.1)
- After 5 failures: account locked for 1 hour (auto-recovery)
- Super-admin and admin notified of lock (dashboard alert + optional email)

---

## 6. AUDIT & ACTIVITY LOGGING

### 6.1 — Rule 6: Audit Trail (Content Changes)

All product/order edits by admin are logged:

- What changed (old value → new value)
- Who changed it (admin email)
- When (timestamp)
- Why (optional note from admin)

Example audit log entry:

```
Product: "Resort Template Pro"
Changed by: john.admin@example.com
Timestamp: 2026-09-01T12:30:00Z
Changes:
  price: 299.00 → 349.00
  status: draft → published
Note: "Price increase for Q4"
```

### 6.2 — Rule 38: Security Logs

Admin actions are logged as `admin_action` events:

- `admin_action` — generic admin operation
- `product_created`, `product_deleted` — product management
- `order_refunded` — order management
- `user_deactivated` — user management

### 6.3 — Rule 42: Account Activity Log

Admin login/logout and page navigation tracked (unless admin opted out):

- Login/logout timestamps
- Pages visited
- IP + device/location (city-level)

---

## 7. RESTRICTIONS ON ACCOUNT CREATION

**CRITICAL PRINCIPLE:** Admin accounts are NEVER created via public registration form.

| Account Type    | Creation Method                                                | Registration Available?                       | Who Can Create?              |
| --------------- | -------------------------------------------------------------- | --------------------------------------------- | ---------------------------- |
| **Buyer**       | Public registration form at `/auth/login`                      | ✅ YES — anyone can self-register             | User themselves              |
| **Admin**       | Manual creation via super-admin dashboard ONLY                 | ❌ NO — no public registration, no self-serve | Super-admin ONLY             |
| **Super-Admin** | Manual creation via Supabase console (one-time platform setup) | ❌ NO — no public registration                | Platform owner (setup phase) |

**Enforcement:**

- Registration form (`/auth/login` "Create Account" tab) only accepts buyer registrations
- No admin account creation option available anywhere on the site
- Backend validates: new users registering via form get role = "buyer" (no exceptions)
- If an admin attempts to create another admin via any route → 403 Forbidden + security log

---

## 8. VAULT & SESSION SLUG SYSTEM

The Admin account includes a **Vault System** for session management and emergency credential backup, similar to super-admin but with a different slug format.

### 8.1 — Session Slug (Auto-Generated)

**What is it:** A unique, auto-generated session identifier created on first login and persists until sign-out.

**Format (Admin):** 21 components total

- 7 random alphanumeric characters (A-Z, a-z, 0-9)
- 7 random alphaspecialcharacters (!@#$%^&\*-\_+=)
- 7 random BIP39 words

**Lifecycle:**

1. **First Login** → No slug exists → Auto-generate new slug → Stored in AdminSession table
2. **Subsequent Logins** → Slug exists & active → Reuse same slug (do NOT regenerate)
3. **Sign-Out** → Slug marked inactive (isActive = false)
4. **Next Login** → Generate completely NEW slug (never reuse old one)

**Storage:**

```json
{
  "alphanumeric": "Aa1Bb2Cc",
  "alphaspecial": "a!B@c#D$",
  "words": ["apple", "beach", "crown", "delta", "eagle", "frost", "guitar"],
  "isActive": true,
  "generatedAt": "2026-09-03T10:35:00Z"
}
```

**Access:** View slug at `/admin/vault` page

### 8.2 — Vault Credentials (Emergency Access)

**What is it:** Offline emergency backup access codes generated manually within the vault page (same format as super-admin).

**Format:** 30 components total

- 15 random BIP39 words
- 15 random alphanumeric characters (A-Z, a-z, 0-9)

**How to Generate:**

1. Navigate to `/admin/vault`
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

### 8.3 — Vault Page (`/admin/vault`)

**Route:** `/admin/vault`

**Access:** Admin role only (middleware protected)

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

## 9. API ENDPOINTS

### GET /api/admin/dashboard

**Permission:** admin (any permission)

**Response:**

```json
{
  "success": true,
  "data": {
    "recentOrders": [...],
    "stats": {
      "totalProducts": 45,
      "totalOrders": 1200,
      "totalRevenue": 45000.00,
      "pendingOrders": 12
    }
  },
  "message": "Dashboard data retrieved."
}
```

### GET /api/admin/products

**Permission:** manage-products

**Query Params:** page, limit, category, status, search

**Response:**

```json
{
  "success": true,
  "data": {
    "products": [...],
    "totalCount": 45,
    "totalPages": 2,
    "page": 1
  },
  "message": "Product list retrieved."
}
```

### POST /api/admin/products

**Permission:** manage-products

**Request:**

```json
{
  "name": "New Product",
  "category": "templates",
  "description": "...",
  "price": 299.0,
  "status": "published"
}
```

**Response:**

```json
{
  "success": true,
  "data": { "productId": "uuid", "name": "New Product" },
  "message": "Product created successfully."
}
```

### PUT /api/admin/products/[productId]

**Permission:** manage-products

**Request:** (same fields as POST)

**Response:**

```json
{
  "success": true,
  "data": { "productId": "uuid" },
  "message": "Product updated successfully."
}
```

### DELETE /api/admin/products/[productId]

**Permission:** manage-products

**Confirmation:** Required (soft delete)

**Response:**

```json
{
  "success": true,
  "data": null,
  "message": "Product deleted successfully."
}
```

### GET /api/admin/orders

**Permission:** manage-orders

**Query Params:** page, limit, status, dateFrom, dateTo, search

**Response:**

```json
{
  "success": true,
  "data": {
    "orders": [...],
    "totalCount": 1200,
    "totalPages": 48,
    "page": 1
  },
  "message": "Order list retrieved."
}
```

### PUT /api/admin/orders/[orderId]/status

**Permission:** manage-orders

**Request:**

```json
{
  "status": "shipped",
  "note": "Shipped via FedEx, tracking #123456"
}
```

**Response:**

```json
{
  "success": true,
  "data": { "orderId": "uuid", "status": "shipped" },
  "message": "Order status updated."
}
```

### POST /api/admin/orders/[orderId]/refund

**Permission:** manage-orders

**Request:**

```json
{
  "reason": "Customer requested refund",
  "amount": 299.0
}
```

**Response:**

```json
{
  "success": true,
  "data": { "orderId": "uuid", "refundStatus": "completed" },
  "message": "Refund issued successfully."
}
```

### GET /api/admin/users

**Permission:** manage-users

**Query Params:** page, limit, status, search

**Response:**

```json
{
  "success": true,
  "data": {
    "users": [...],
    "totalCount": 5000,
    "totalPages": 200,
    "page": 1
  },
  "message": "User list retrieved."
}
```

### GET /api/admin/analytics

**Permission:** view-analytics

**Query Params:** dateFrom, dateTo, category

**Response:**

```json
{
  "success": true,
  "data": {
    "ordersTrend": [...],
    "revenueTrend": [...],
    "categoryBreakdown": {...},
    "topProducts": [...]
  },
  "message": "Analytics data retrieved."
}
```

### GET /api/admin/security-logs

**Permission:** `view-security-logs`

**Query Params:** page, limit, eventType, dateFrom, dateTo

**Scope:** Server always applies `WHERE actor = currentAdmin.email` regardless of query params — an admin can never request another account's events.

**Response:**

```json
{
  "success": true,
  "data": {
    "logs": [...],
    "totalCount": 18,
    "totalPages": 1,
    "page": 1
  },
  "message": "Security logs retrieved."
}
```

### GET /api/admin/account-activity

**Permission:** admin (any — self-scoped, no special permission required)

**Query Params:** page, limit, actionType, dateFrom, dateTo

**Scope:** Server always applies `WHERE accountId = currentAdmin.id`.

**Response:**

```json
{
  "success": true,
  "data": {
    "activities": [...],
    "totalCount": 132,
    "totalPages": 6,
    "page": 1
  },
  "message": "Account activity retrieved."
}
```

### GET /api/admin/profile

**Permission:** admin (any — self only)

**Response:**

```json
{
  "success": true,
  "data": {
    "adminId": "uuid",
    "fullName": "John Admin",
    "email": "john.admin@example.com",
    "avatarUrl": "https://cdn.example.com/avatars/john.webp",
    "permissions": ["manage-products", "manage-orders"],
    "notificationPreferences": {
      "newOrderEmail": true,
      "lowStockEmail": false,
      "weeklySummaryEmail": true
    }
  },
  "message": "Profile retrieved."
}
```

### PUT /api/admin/profile

**Permission:** admin (any — self only)

**Request:**

```json
{
  "fullName": "John A. Admin",
  "avatarUrl": "https://cdn.example.com/avatars/john-new.webp",
  "notificationPreferences": {
    "newOrderEmail": true,
    "lowStockEmail": true,
    "weeklySummaryEmail": false
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": { "adminId": "uuid" },
  "message": "Profile updated successfully."
}
```

### PUT /api/admin/profile/password

**Permission:** admin (any — self only)

**Request:**

```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response (success):**

```json
{
  "success": true,
  "data": null,
  "message": "Password updated successfully."
}
```

**Response (wrong current password):**

```json
{
  "success": false,
  "data": null,
  "message": "Current password is incorrect.",
  "error": "INVALID_CURRENT_PASSWORD"
}
```

---

## 10. TESTING & VERIFICATION CHECKLIST

- [ ] Admin can log in at `/auth/login`
- [ ] Admin is redirected to `/admin/dashboard` after login
- [ ] Admin can only access pages matching their permissions
- [ ] Admin cannot access `/superAdmin/*` routes (403 Forbidden)
- [ ] Admin cannot access super-admin-only operations (create admin, vault, etc.)
- [ ] Admin can create products if they have `manage-products` permission
- [ ] Admin can manage orders if they have `manage-orders` permission
- [ ] Admin can view analytics if they have `view-analytics` permission
- [ ] Audit logs record all admin actions with timestamps
- [ ] Security logs record admin logins and key actions
- [ ] Failed login attempts locked account after 5 failures
- [ ] Password reset email sent when admin requests reset
- [ ] Session timeout after 15 minutes of inactivity
- [ ] Permission check enforced on every API endpoint
- [ ] Admin cannot create another admin (403 if attempted)
- [ ] Admin with `view-security-logs` permission only sees their own events at `/admin/security-logs` (never another account's)
- [ ] Admin can view their own activity trail at `/admin/account-activity` without any special permission
- [ ] Admin can update their name/avatar/notification preferences at `/admin/profile`
- [ ] Admin cannot change password without correctly entering their current password
- [ ] Bulk actions on Orders and Buyers lists require confirmation before executing (Rule 34.4)
- [ ] All tests pass with `npx tsc --noEmit`

---

## 11. CHANGE LOG

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-03 | Aligned with Super-Admin spec: expanded Section 3.6 into a full Security Logs page spec (self-scoped, Rule 38.9 pattern); added Section 3.7 Account Activity Log (self-scoped, Rule 42); added Section 3.8 My Profile & Account Settings (RECOMMENDED — self-service name/avatar/password/notification prefs, previously missing); added bulk actions to Order List and Buyer List for parity with Product List; added matching API endpoints (`GET /api/admin/security-logs`, `GET /api/admin/account-activity`, `GET`/`PUT /api/admin/profile`, `PUT /api/admin/profile/password`); updated verification checklist. |
| 2026-09-03 | Added Section 8: Vault & Session Slug System — admin slug format (7 alphanumeric + 7 alphaspecial + 7 words), auto-generation on first login, slug reuse on subsequent logins, new slug on sign-out + next login. Added vault credentials (15 words + 15 alphanumeric) for emergency access.                                                                                                                                                                                                                                                                                                                          |
| 2026-09-01 | Initial admin specification created; dashboard, product/order/user management, permissions, and restrictions documented.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

---

**Document Version:** 1.1  
**Last Updated:** 2026-09-03  
**Status:** Specification Complete
