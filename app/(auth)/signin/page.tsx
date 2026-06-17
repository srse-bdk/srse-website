"use client";

import { firebaseAuth, mutate } from "@atechhub/firebase";
import type { User } from "@/lib/types/user.type";
import { normalizeLoginEmail } from "@/lib/utils/auth-email";
import { getAuthErrorMessage } from "@/lib/utils/auth-errors";
import { normalizePen } from "@/lib/utils/student-login";
import { isProfileOnlyStaff } from "@/lib/utils/staff-profile";
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
      } else {
        loginEmail = normalizeLoginEmail(loginIdentifier);

        const allUsers = (await mutate({
          action: "get",
          path: "users",
        })) as Record<string, User> | null;

        const portalUser = Object.values(allUsers || {}).find(
          (user) =>
            user?.email &&
            normalizeLoginEmail(user.email) === loginEmail,
        );

        if (portalUser) {
          if (isProfileOnlyStaff(portalUser)) {
            throw new Error(
              "This account cannot sign in to the portal. Please contact the school office.",
            );
          }
          if (portalUser.status === "inactive") {
            throw new Error(
              "Your account is inactive. Please contact the school office.",
            );
          }
        }
      }

      await firebaseAuth({
        action: "login",
        email: loginEmail,
        password: data.password,
      });
    } catch (error) {
      console.error("Signin error:", error);
      throw new Error(getAuthErrorMessage(error, "Failed to sign in. Please check your credentials."));
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
