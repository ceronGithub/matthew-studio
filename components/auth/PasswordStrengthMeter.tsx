/**
 * FILE: components/auth/PasswordStrengthMeter.tsx
 * ROLE: Auth — visual strength indicator shown under the Create
 * Account password field.
 *
 * PURPOSE:
 * Scores the password against four checks (length, uppercase, number,
 * special character) and renders a 4-segment meter plus a label. Pure
 * presentational component — the actual pass/fail validation used to
 * accept/reject the form lives in RegisterForm.tsx and is re-checked
 * server-side in the register API route.
 */
"use client";

interface PasswordStrengthMeterProps {
  password: string;
}

function scorePassword(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const score = password.length === 0 ? 0 : scorePassword(password);

  return (
    <div className="passwordStrengthMeter">
      <div className="passwordStrengthBars">
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={`passwordStrengthBar ${segment <= score ? `passwordStrengthBar--${score}` : ""}`}
          />
        ))}
      </div>
      {password.length > 0 && <span className="passwordStrengthLabel">{STRENGTH_LABELS[score]}</span>}
    </div>
  );
}
