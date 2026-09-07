/**
 * FILE: lib/securityQuestions.ts
 * PURPOSE:
 * Single source of truth for the Security Question bank
 * (buyer_password_recovery_specification.md Section 2.3.1). Both
 * the recovery-setup UI (dropdown options) and the API route
 * (server-side validation of the submitted questionId) import this
 * list — never hardcode the questions in either place separately,
 * or they will drift out of sync.
 *
 * `id` is the stable key stored in BuyerRecovery.securityQuestionId
 * — never the question text itself, so re-wording a question later
 * never breaks an existing buyer's stored answer.
 */

export interface SecurityQuestion {
  id: string;
  text: string;
}

export const SECURITY_QUESTION_BANK: SecurityQuestion[] = [
  { id: "first_pet", text: "What was the name of your first pet?" },
  { id: "childhood_best_friend", text: "What was your childhood best friend's first name?" },
  { id: "mothers_maiden_name", text: "What is your mother's maiden name?" },
  { id: "birth_city", text: "What city were you born in?" },
  { id: "first_car_model", text: "What was the model of your first car?" },
  { id: "elementary_school", text: "What was the name of your elementary school?" },
  { id: "favorite_teacher", text: "What was your favorite teacher's name?" },
  { id: "childhood_street", text: "What street did you grow up on?" },
];

/**
 * isValidSecurityQuestionId
 * Server-side guard so the API route never trusts a client-submitted
 * questionId that doesn't match a real bank entry.
 */
export function isValidSecurityQuestionId(questionId: string): boolean {
  return SECURITY_QUESTION_BANK.some((question) => question.id === questionId);
}
