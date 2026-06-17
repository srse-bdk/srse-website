import { NextResponse } from "next/server";
import { z } from "zod";
import { isFirebaseAdminConfigured } from "@/lib/env";
import { isProfileOnlyStaff } from "@/lib/utils/staff-profile";
import { normalizeLoginEmail } from "@/lib/utils/auth-email";
import {
  getFirebaseAdminAuth,
  getRealtimeValue,
  updateRealtime,
} from "@/lib/utils/firebase-admin-app";
import type { User } from "@/lib/types/user.type";

const bodySchema = z.object({
  staffId: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        {
          error:
            "Password reset is not available on this server. Configure Firebase Admin credentials.",
        },
        { status: 503 },
      );
    }

    const body = bodySchema.parse(await request.json());
    const staff = (await getRealtimeValue(`users/${body.staffId}`)) as User | null;

    if (!staff || staff.role !== "staff") {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    if (isProfileOnlyStaff(staff)) {
      return NextResponse.json(
        { error: "This staff profile has no portal login." },
        { status: 400 },
      );
    }

    const email = normalizeLoginEmail(staff.email || "");
    if (!email) {
      return NextResponse.json(
        { error: "Staff email is missing on the profile." },
        { status: 400 },
      );
    }

    const auth = await getFirebaseAdminAuth();
    let authUid = staff.uid || body.staffId;

    try {
      await auth.getUser(authUid);
      await auth.updateUser(authUid, { email, password: body.newPassword });
    } catch (error: unknown) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code: unknown }).code === "string"
          ? (error as { code: string }).code
          : "";

      if (code === "auth/user-not-found") {
        try {
          const existing = await auth.getUserByEmail(email);
          authUid = existing.uid;
          await auth.updateUser(authUid, {
            password: body.newPassword,
            email,
          });
        } catch (emailLookupError: unknown) {
          const emailCode =
            typeof emailLookupError === "object" &&
            emailLookupError !== null &&
            "code" in emailLookupError &&
            typeof (emailLookupError as { code: unknown }).code === "string"
              ? (emailLookupError as { code: string }).code
              : "";

          if (emailCode === "auth/user-not-found") {
            const created = await auth.createUser({
              uid: staff.uid?.startsWith("staff_") ? undefined : staff.uid,
              email,
              password: body.newPassword,
              emailVerified: true,
            });
            authUid = created.uid;
          } else {
            throw emailLookupError;
          }
        }
      } else {
        throw error;
      }
    }

    const nowISO = new Date().toISOString();
    await updateRealtime(`users/${body.staffId}`, {
      uid: authUid,
      email,
      password: body.newPassword,
      hasLogin: true,
      updatedAt: nowISO,
    });

    return NextResponse.json({ success: true, authUid });
  } catch (error) {
    console.error("Staff password reset failed:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid request" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to reset password",
      },
      { status: 500 },
    );
  }
}
