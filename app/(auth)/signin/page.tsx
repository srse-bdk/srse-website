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

      await firebaseAuth({
        action: "login",
        email: loginEmail,
        password: data.password,
      });
    } catch (error) {
      console.error("Signin error:", error);

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
        throw error;
      }

      throw new Error("Failed to sign in. Please check your credentials.");
    }
  };

  return (
    <AuthForm
      title="Welcome back"
      description="Sign in with credentials issued by the school. Public registration is not available."
      submitText="Sign in"
      onSubmit={handleEmailSignIn}
      allowIdentifierLogin={true}
    />
  );
}
