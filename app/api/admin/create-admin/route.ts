/**
 * FILE: app/api/admin/create-admin/route.ts
 * ROLE: Super-admin only — self-checked via getSessionAdmin() since
 * /api/admin/* is not in middleware.ts's matcher.
 *
 * PURPOSE:
 * super_admin_account_specification.md Section 3.2.2 (Create Admin
 * Account) — Phase 3 of the Admin Management area, task-93 of 6
 * (list/detail/edit/actions come in task-94/95, the three UI pages
 * in task-96/97/98).
 *
 * Only a super-admin may create an admin account — this route checks
 * admin.role === "superAdmin" directly rather than
 * hasAdminPermission(), since permission strings (Section 4.1) are an
 * admin-level ceiling and creating new admins sits above that, same
 * as task-93's own scope note.
 *
 * DATA FLOW:
 * 1. Validate fullName / email / permissions from the request body.
 * 2. Reject if the email is already registered (Supabase Auth admin
 *    listUsers — this project has no local User table to query).
 * 3. Generate a 16-char temp password, create the Supabase user with
 *    role="admin" + permissions in user_metadata.
 * 4. Email the temp password to the new admin via a dedicated EmailJS
 *    template (Rule 35.5: one template per email type).
 * 5. Log admin_created to SecurityLog (Rule 38).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { logSecurityEvent } from "@/lib/securityLog";
import { sendEmail } from "@/services/emailjs";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

// Section 4.1's known permission strings — the only values a
// super-admin may grant to a new admin. Kept as a literal list here
// (rather than importing from hasAdminPermission.ts, which only
// checks a single permission against an already-created user) so an
// invalid string in the request body is rejected before any Supabase
// user is created.
const KNOWN_PERMISSIONS = [
  "manage-products",
  "manage-orders",
  "manage-users",
  "view-analytics",
  "view-security-logs",
  "manage-promotions",
] as const;

const TEMP_PASSWORD_LENGTH = 16;
const TEMP_PASSWORD_CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";

/**
 * generateTempPassword
 * Cryptographically-random 16-char alphanumeric+special string.
 * Excludes visually-ambiguous characters (0/O, 1/l/I) since this
 * password is read off an email and typed in once, not stored
 * long-term by the admin.
 */
function generateTempPassword(): string {
  let password = "";
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
    password += TEMP_PASSWORD_CHARSET[randomInt(0, TEMP_PASSWORD_CHARSET.length)];
  }
  return password;
}

interface CreateAdminBody {
  fullName?: string;
  email?: string;
  permissions?: string[];
}

export async function POST(request: Request) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    // Only a super-admin may create admin accounts — an admin (even
    // one with every Section 4.1 permission) is never authorized here.
    if (admin.role !== "superAdmin") {
      return NextResponse.json(
        { success: false, data: null, message: "You don't have permission to view this page." },
        { status: 403 }
      );
    }

    const body: CreateAdminBody = await request.json();
    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const permissions = Array.isArray(body.permissions) ? body.permissions : [];

    if (!fullName || fullName.length < 2) {
      return NextResponse.json(
        { success: false, data: null, message: "Please enter a full name (at least 2 characters)." },
        { status: 400 }
      );
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailPattern.test(email)) {
      return NextResponse.json(
        { success: false, data: null, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const invalidPermission = permissions.find(
      (permission) => !KNOWN_PERMISSIONS.includes(permission as (typeof KNOWN_PERMISSIONS)[number])
    );
    if (invalidPermission) {
      return NextResponse.json(
        { success: false, data: null, message: `"${invalidPermission}" is not a recognized permission.` },
        { status: 400 }
      );
    }

    // Uniqueness check — Supabase Auth is the source of truth for
    // every account (admin, super-admin, buyer) in this project;
    // there is no local User table to query instead.
    const { data: existingUsers, error: listError } = await supabaseAdminClient.auth.admin.listUsers();
    if (listError) {
      console.error("[create-admin] Failed to check existing users:", listError.message);
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't verify that email. Please try again." },
        { status: 500 }
      );
    }
    const emailTaken = existingUsers.users.some((user) => user.email?.toLowerCase() === email);
    if (emailTaken) {
      return NextResponse.json(
        { success: false, data: null, message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const tempPassword = generateTempPassword();

    const { data: created, error: createError } = await supabaseAdminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: "admin", permissions, fullName },
    });

    if (createError || !created.user) {
      console.error("[create-admin] Failed to create Supabase user:", createError?.message);
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't create the admin account. Please try again." },
        { status: 500 }
      );
    }

    const newAdminId = created.user.id;

    // Email delivery failure never rolls back the created account —
    // same precedent as task-86's reset_password action: the account
    // exists either way, so surface the failure but don't undo the
    // create. The super-admin can resend credentials manually if this
    // fails (out of scope for this task; a future action, not a
    // reason to fail the whole request here).
    const emailResult = await sendEmail(process.env.EMAILJS_TEMPLATE_ID_ADMIN_ACCOUNT_CREATED ?? "", {
      to_email: email,
      full_name: fullName,
      temp_password: tempPassword,
      login_url: `${process.env.APP_URL ?? ""}/auth/login`,
    });

    await logSecurityEvent({
      eventType: "admin_created",
      actor: admin.email,
      request,
      details: `New admin account created for ${email}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        adminId: newAdminId,
        email,
        createdAt: created.user.created_at,
        createdBy: admin.email,
      },
      message: emailResult.success
        ? "Admin account created. Credentials have been emailed."
        : "Admin account created, but the credentials email failed to send. Please share the temporary password with them another way.",
    });
  } catch (error) {
    console.error("[create-admin] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
