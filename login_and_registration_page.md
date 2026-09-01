# Login & Registration Page — Buyer Account

## 1. PURPOSE

This page enables new buyers to register an account and existing buyers to log in to the Matthew Studio marketplace. The page is accessible at `/auth/login` and handles both authentication and account creation flows.

## 2. ACCOUNT TYPE & ACCOUNT CREATION POLICY

### 2.1 — Buyer Account (THIS PAGE)

- **Role:** Customer/marketplace user
- **Creation Method:** Public registration form at `/auth/login` (anyone can self-register)
- **Authenticated state:** Stored in Supabase (`user_metadata.role = "buyer"`)
- **Protected routes:** `/buyer/*` (protected by middleware.ts)

### 2.2 — Admin & Super-Admin Account Creation (DIFFERENT PROCESS)

**CRITICAL PRINCIPLE:** Admin and Super-Admin accounts are **NEVER created via public registration**.

| Account Type    | Creation Method                                                               | Self-Registration Available?      | Who Can Create?                     | Related Docs                           |
| --------------- | ----------------------------------------------------------------------------- | --------------------------------- | ----------------------------------- | -------------------------------------- |
| **Buyer**       | Public registration form (this page)                                          | ✅ YES — anyone can self-register | Users themselves                    | This document                          |
| **Admin**       | Manual creation by Super-Admin only via `/superAdmin/admin-management/create` | ❌ NO                             | Super-Admin only                    | `admin_account_specification.md`       |
| **Super-Admin** | Manual creation via Supabase dashboard (platform setup only, one-time)        | ❌ NO                             | Platform owner during initial setup | `super_admin_account_specification.md` |

**Enforcement:**

- `/auth/login` registration form ONLY accepts buyer accounts
- All new users registering via this page are automatically assigned `role = "buyer"`
- Backend validates: registration endpoint rejects any attempt to create admin/superAdmin accounts
- Admin accounts are created exclusively by super-admin via dashboard (documented separately)
- Super-admin accounts are created exclusively via Supabase console during platform initialization

## 3. LAYOUT & DESIGN

- Full-viewport centered card layout (desktop) / full-width (mobile)
- Card has subtle border, layered background (surface-active), rounded corners (12px)
- Two tabs: "Sign In" (default) and "Create Account" — tab headers use accent green on active
- Both tabs have smooth opacity fade between them (0.25s transition)

### 3.1 — Sign In Tab

**Fields:**

- Email input (type="email", autoFocus, required)
- Password input (type="password", with show/hide toggle icon)
- "Forgot Password?" link (TODO: password reset flow)

**Actions:**

- "Sign In" button (green accent, full width, disabled during submission)
- "Don't have an account?" link switches to "Create Account" tab
- Loading state on button shows spinner

**Validation:**

- Email must be valid email format
- Password must not be empty
- Show inline errors below each field (red text, aria-label)
- No form-level error summary — field-level only

**On Success:**

- Toast: ✓ "Signed in successfully. Redirecting…"
- Redirect to `/buyer/dashboard` (or first unvisited protected page)
- Session token stored in HttpOnly cookie (no localStorage)

**On Failure:**

- Toast: ✕ "Invalid email or password."
- Never reveal which field was wrong (prevent email enumeration)
- Security log: `login_failed` event logged to Rule 38 SecurityLog table

### 3.2 — Create Account Tab

**Fields:**

- Full Name input (required, min 2 chars)
- Email input (type="email", required, must not already exist)
- Password input (required, min 8 chars, must include 1 uppercase + 1 number + 1 special char)
- Confirm Password input (required, must match password field)
- Terms of Service checkbox (required, links to /terms)

**Actions:**

- "Create Account" button (green accent, full width, disabled during submission)
- "Already have an account?" link switches to "Sign In" tab
- Loading state on button shows spinner

**Validation:**

- Email must be unique (checked via API before submission — fetch `/api/auth/check-email`)
- Password strength indicator (visual meter: weak → fair → good → strong, updates as user types)
- All required fields must be filled
- Show inline errors below each field
- Terms checkbox must be checked

**On Success:**

- Create new Supabase user (`auth.users` table) with role = "buyer" in `user_metadata`
- Auto-login the new user (session token issued immediately)
- Toast: ✓ "Account created successfully! Welcome…"
- Redirect to `/buyer/dashboard` with onboarding modal (first-time buyer setup)

**On Failure:**

- Email already exists: ✕ "Email already registered. Please sign in instead."
- Network error: ✕ "Could not create account. Please check your connection and try again."
- Password validation: ✕ specific error per requirement failed (e.g. "Password must include 1 number")
- Security log: `registration_failed` event logged (email + reason)

## 4. API ENDPOINTS

### POST /api/auth/login

**Request:**

```json
{
  "email": "buyer@example.com",
  "password": "SecurePass123!"
}
```

**Response (success):**

```json
{
  "success": true,
  "data": { "userId": "uuid", "email": "buyer@example.com", "role": "buyer" },
  "message": "Signed in successfully."
}
```

**Response (failure):**

```json
{
  "success": false,
  "data": null,
  "message": "Invalid email or password.",
  "error": "Authentication failed"
}
```

### POST /api/auth/register

**Request:**

```json
{
  "email": "buyer@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe"
}
```

**Response (success):**

```json
{
  "success": true,
  "data": { "userId": "uuid", "email": "buyer@example.com", "role": "buyer" },
  "message": "Account created successfully."
}
```

**Response (failure - email exists):**

```json
{
  "success": false,
  "data": null,
  "message": "Email already registered.",
  "error": "Email duplicate"
}
```

### GET /api/auth/check-email?email=buyer@example.com

**Response:**

```json
{
  "success": true,
  "data": { "available": false },
  "message": "Email availability checked."
}
```

## 5. SECURITY REQUIREMENTS (Rule 18 / 32)

- Rate limit: max 5 login attempts per IP per 15 minutes (Rule 32.1)
- Rate limit: max 3 registration attempts per IP per 15 minutes
- Input sanitization: strip forbidden characters (< > { } [ ] / \ ; -- ' " ` =) from full name field
- All passwords sent via HTTPS only, never logged
- CSRF token protection on form submission (Rule 32.2)
- Session cookie: HttpOnly + Secure + SameSite=strict (Rule 18.4)
- Account takeover detection: log device fingerprint + geolocation per Rule 38

## 6. COMPONENTS & FILES

- `app/(auth)/layout.tsx` — auth route group layout (no nav/footer, centered card)
- `app/(auth)/login/page.tsx` — main page component (tabs + form switching)
- `components/auth/SignInForm.tsx` — sign-in tab form, calls `/api/auth/login`
- `components/auth/RegisterForm.tsx` — registration tab form, calls `/api/auth/register`
- `components/auth/PasswordStrengthMeter.tsx` — visual password strength indicator
- `app/api/auth/login/route.ts` — login endpoint
- `app/api/auth/register/route.ts` — registration endpoint
- `app/api/auth/check-email/route.ts` — email availability check (debounced from client)
- `app/styles/auth.css` — sign-in/register card, tab, form, error/success states

## 7. ROUTING & REDIRECTS

- Public: `/auth/login` (no auth required, visible to anonymous visitors)
- After successful login: redirect to `/buyer/dashboard`
- If already logged in as buyer, redirect `/auth/login` → `/buyer/dashboard`
- If logged in as admin/superAdmin, redirect `/auth/login` → `/superAdmin/dashboard`

## 8. MIDDLEWARE PROTECTION (middleware.ts)

- Protected route: `/buyer/*` — requires `role = "buyer"`
- Unprotected: `/auth/login`, `/auth/register`, all `/` public pages
- On unauthorized access to `/buyer/*`: redirect to `/auth/login` with `?next=/buyer/dashboard` prefill

## 9. TOAST NOTIFICATIONS (Rule 22)

- Login success: ✓ "Signed in successfully. Redirecting…"
- Login failure: ✕ "Invalid email or password."
- Registration success: ✓ "Account created successfully! Welcome…"
- Registration failure (email exists): ✕ "Email already registered. Please sign in instead."
- Registration failure (network): ✕ "Could not create account. Please check your connection and try again."
- Registration failure (password weak): ✕ "Password must include uppercase, number, and special character."
- Email check (debounced): ✕ "Email already in use." (inline below email field, not toast)

## 10. FIRST-TIME BUYER ONBOARDING (Post-Registration)

After successful registration, show a modal overlay:

- Heading: "Welcome to Matthew Studio Marketplace!"
- Content: Brief onboarding checklist (3–4 items)
  - [ ] Complete your profile
  - [ ] Browse templates
  - [ ] Add payment method
  - [ ] Explore tutorials
- "Get Started" button → `/buyer/dashboard`
- Modal can be dismissed, skipped later via Settings

## 11. FUTURE FEATURES

- Social login (Google / GitHub OAuth) — Phase 2
- Email verification (confirm email before full account access) — Phase 2
- Two-factor authentication (optional for buyer accounts) — Phase 3
- Magic link login (no password, email-only) — Phase 3

---

## 12. ADMIN & SUPER-ADMIN ACCOUNT MANAGEMENT (SEPARATE PROCESS)

### 12.1 — Key Differences from Buyer Registration

This page (`/auth/login`) is ONLY for buyer account creation and login. Admin and Super-Admin accounts are managed through completely separate, restricted processes:

**Buyer Account (This Page):**

- ✅ Public registration form
- ✅ Self-service account creation
- ✅ No approval required
- ✅ Login via `/auth/login` Sign In tab

**Admin Account (Separate Process):**

- ❌ NO public registration form
- ❌ Manual creation by super-admin only
- ✅ Created via `/superAdmin/admin-management/create` dashboard page
- ✅ Login via `/auth/login` Sign In tab (same as buyer, different role)
- 📖 Full documentation: `admin_account_specification.md`

**Super-Admin Account (Separate Process):**

- ❌ NO public registration form
- ❌ Manual creation via Supabase console only
- ✅ One-time setup during platform initialization
- ✅ Login via `/auth/login` Sign In tab (same as buyer, different role)
- 📖 Full documentation: `super_admin_account_specification.md`

### 12.2 — Why This Separation Exists

The separation between buyer registration and admin account creation ensures:

1. **Security:** Admins cannot be created by anyone except those with explicit authority
2. **Audit Trail:** All admin account creations are logged and traced to the creator
3. **Least Privilege:** Admins cannot grant themselves or others additional permissions
4. **Control:** Only super-admin has the ability to create admin accounts

### 12.3 — Unified Login Endpoint

Despite the separate account creation processes, all account types (buyer, admin, super-admin) use the same `/auth/login` endpoint:

- Email + password authentication is identical
- Role is determined by the `user_metadata.role` field in Supabase
- Middleware.ts redirects users to their respective dashboards:
  - Buyer → `/buyer/dashboard`
  - Admin → `/admin/dashboard`
  - Super-Admin → `/superAdmin/dashboard`

### 12.4 — For Admin/Super-Admin Documentation

- **Admin Account Management:** See `admin_account_specification.md` for full details on permissions, dashboard, and restrictions
- **Super-Admin Account Management:** See `super_admin_account_specification.md` for full details on system administration and vault credentials

---

## 13. ACCOUNT CREATION VALIDATION (Backend Rules)

### 13.1 — Registration Endpoint Security

The `/api/auth/register` endpoint enforces:

```typescript
export async function POST(request: Request) {
  const { email, password, fullName } = await request.json();

  // CRITICAL: Only "buyer" role can self-register
  // No "admin" or "superAdmin" role allowed

  // 1. Validate that registration is ONLY for buyer accounts
  // 2. Create Supabase user with role = "buyer" (no other role accepted)
  // 3. Reject if attempt to set role = "admin" or "superAdmin"
  // 4. Log registration attempt to SecurityLog (Rule 38)
  // 5. Return success with buyer role in response
}
```

### 13.2 — Forbidden in Registration

The following are **NEVER permitted** through public registration:

- ❌ Registration with `role = "admin"`
- ❌ Registration with `role = "superAdmin"`
- ❌ Any attempt to specify a role (role is always set to "buyer" by backend)
- ❌ Any permission flags or elevated access (all granted via super-admin only)

If any such attempt is detected, the registration is rejected with HTTP 403 Forbidden.
