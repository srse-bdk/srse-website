function getErrorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return String(error ?? "");
}

export function isAuthRateLimited(error: unknown): boolean {
  const text = getErrorText(error).toLowerCase();
  return (
    text.includes("too-many-requests") ||
    text.includes("too_many_attempts_try_later") ||
    text.includes("too many attempts")
  );
}

export function getAuthErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const text = getErrorText(error).toLowerCase();

  if (
    text.includes("user-not-found") ||
    text.includes("invalid-credential") ||
    text.includes("wrong-password")
  ) {
    return "Invalid email or password. Please check your credentials.";
  }

  if (isAuthRateLimited(error)) {
    return "Too many failed sign-in attempts. This account is temporarily locked. Please wait 15–30 minutes before trying again, or ask an admin to reset the password using Firebase Admin.";
  }

  if (text.includes("user-disabled")) {
    return "This account has been disabled. Please contact the school office.";
  }

  if (text.includes("weak-password")) {
    return "Password is too weak. Use at least 8 characters.";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
