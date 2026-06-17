/** Firebase Auth treats emails as case-insensitive; store and compare in lowercase. */
export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}
