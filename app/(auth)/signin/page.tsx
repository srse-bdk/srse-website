"use client";

import { firebaseAuth } from "@atechhub/firebase";
import { mutate } from "@atechhub/firebase";
import type { User } from "@/lib/types/user.type";
import { normalizePen } from "@/lib/utils/student-login";
import { AuthForm, type AuthFormData } from "../_components/auth-form";
export default function SignInPage() {
  const handleEmailSignIn = async (data: AuthFormData) => {
    try {
      const loginIdentifier = data.email.trim();
      let loginEmail = loginIdentifier;

      // Allow students to sign in with PEN number instead of email.
      if (!loginIdentifier.includes("@")) {
        const allUsers = (await mutate({
          action: "get",
          path: "users",
        })) as Record<string, User> | null;

        const normalizedPen = normalizePen(loginIdentifier);
        const studentUser = Object.values(allUsers || {}).find(
          (user) =>
            user?.role === "student" &&
            normalizePen(user?.pen || "") === normalizedPen,
        );

        if (!studentUser?.email) {
          throw new Error(
            "Invalid PEN or password. Please check your credentials.",
          );
        }

        loginEmail = studentUser.email;
      }

      const res = await firebaseAuth({
        action: "login",
        email: loginEmail,
        password: data.password,
      });
      console.log(res);
    } catch (error) {
      console.error("Signin error:", error);

      // Handle specific Firebase errors
      if (error instanceof Error) {
        if (
          error.message.includes("user-not-found") ||
          error.message.includes("invalid-credential")
        ) {
          throw new Error(
            "Invalid email or password. Please check your credentials.",
          );
        }
        if (error.message.includes("too-many-requests")) {
          throw new Error("Too many failed attempts. Please try again later.");
        }
        if (error.message.includes("user-disabled")) {
          throw new Error(
            "This account has been disabled. Please contact support.",
          );
        }
        // Re-throw the original error if it has a user-friendly message
        throw error;
      }

      throw new Error("Failed to sign in. Please check your credentials.");
    }
  };

  return (
    <AuthForm
      title="Welcome back"
      description="Sign in to your account to continue"
      submitText="Sign in"
      onSubmit={handleEmailSignIn}
      allowIdentifierLogin={true}
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkHref="/signup"
    />
  );
}
