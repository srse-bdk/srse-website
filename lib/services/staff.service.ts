import { getArrFromObj } from "@ashirbad/js-core";
import {
  changePassword,
  createUser,
  deleteUser,
  mutate,
} from "@atechhub/firebase";
import type { User, UserInput, UserUpdateInput, ProfileOnlyStaffInput } from "@/lib/types/user.type";
import { normalizeLoginEmail } from "@/lib/utils/auth-email";
import { getAuthErrorMessage, isAuthRateLimited } from "@/lib/utils/auth-errors";
import { ensureUniqueScanId, generateUniqueScanId } from "@/lib/utils/scan-id";
import { isProfileOnlyStaff } from "@/lib/utils/staff-profile";

function generateProfileStaffId(): string {
  return `staff_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

class StaffService {
  /**
   * Create a non-teaching profile for ID cards only (no Firebase Auth login).
   */
  async createProfileOnly(data: ProfileOnlyStaffInput): Promise<{ userId: string }> {
    const profileId = generateProfileStaffId();
    const scanId = data.scanId
      ? await ensureUniqueScanId(data.scanId)
      : await generateUniqueScanId("STF");

    const userId = await mutate({
      action: "create",
      path: `users/${profileId}`,
      data: {
        uid: profileId,
        scanId,
        name: data.name,
        email: "",
        password: "",
        role: "staff",
        status: "active",
        staffType: "non-teaching",
        hasLogin: false,
        bloodGroup: data.bloodGroup,
        position: data.position,
        phoneNumber: data.phoneNumber,
        subjectAssignments: [],
      },
      actionBy: "admin",
    });

    return { userId: userId || profileId };
  }

  /**
   * Create a new staff (includes Firebase Auth user creation)
   */
  async create(data: UserInput): Promise<{
    userId: string;
    authResponse: Awaited<ReturnType<typeof createUser>>;
  }> {
    const email = normalizeLoginEmail(data.email);

    // Step 1: Create Firebase Auth user
    const authResponse = await createUser(email, data.password);

    const scanId = data.scanId
      ? await ensureUniqueScanId(data.scanId)
      : await generateUniqueScanId("STF");

    // Step 2: Create staff record in users database
    const userId = await mutate({
      action: "create",
      path: `users/${authResponse.localId}`,
      data: {
        uid: authResponse.localId,
        scanId,
        name: data.name,
        email,
        password: data.password,
        role: "staff",
        status: "active",
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        position: data.position,
        staffType: data.staffType,
        phoneNumber: data.phoneNumber,
        hasLogin: true,
        subjectAssignments: data.subjectAssignments || [],
      },
      actionBy: "admin",
    });

    return { userId, authResponse };
  }

  /**
   * Get all staffs
   */
  async getAll(): Promise<User[]> {
    const data = await mutate({
      action: "get",
      path: "users",
    });
    const allUsers = getArrFromObj(data || {}) as unknown as User[];
    return allUsers.filter((user) => user.role === "staff");
  }

  /**
   * Get a staff by ID
   */
  async getById(id: string): Promise<User | null> {
    const data = await mutate({
      action: "get",
      path: `users/${id}`,
    });
    const staff = data as unknown as User;
    return staff && staff.role === "staff" ? staff : null;
  }

  /**
   * Update a staff
   */
  async update(id: string, data: UserUpdateInput): Promise<void> {
    await mutate({
      action: "update",
      path: `users/${id}`,
      data: {
        ...data,
      },
      actionBy: "admin",
    });
  }

  /**
   * Delete a profile-only staff record (no Firebase Auth account).
   */
  async deleteProfileOnly(id: string): Promise<void> {
    await mutate({
      action: "delete",
      path: `users/${id}`,
      actionBy: "admin",
    });
  }

  /**
   * Delete a staff (includes Firebase Auth user deletion)
   */
  async delete(
    id: string,
    email: string,
    currentPassword: string,
  ): Promise<void> {
    // Step 1: Delete Firebase Auth user
    await deleteUser(email, currentPassword);

    // Step 2: Delete database record
    await mutate({
      action: "delete",
      path: `users/${id}`,
      actionBy: "admin",
    });
  }

  /**
   * Delete a staff by ID only (uses stored password from database)
   * This is a simpler version that doesn't require manual password input
   */
  async deleteById(id: string): Promise<void> {
    const staff = await this.getById(id);
    if (!staff) {
      throw new Error("Staff not found");
    }

    if (isProfileOnlyStaff(staff)) {
      await this.deleteProfileOnly(id);
      return;
    }

    if (!staff.email || !staff.password) {
      throw new Error("Staff email or password not available");
    }

    // Step 1: Delete Firebase Auth user using stored credentials
    await deleteUser(staff.email, staff.password);

    // Step 2: Delete database record
    await mutate({
      action: "delete",
      path: `users/${id}`,
      actionBy: "admin",
    });
  }

  /**
   * Get staff by email
   */
  async getByEmail(email: string): Promise<User | null> {
    const normalized = normalizeLoginEmail(email);
    const staffs = await this.getAll();
    return (
      staffs.find(
        (staff) =>
          staff.email && normalizeLoginEmail(staff.email) === normalized,
      ) || null
    );
  }

  /**
   * Get staff by Firebase UID
   */
  async getByFirebaseUid(uid: string): Promise<User | null> {
    const staffs = await this.getAll();
    return staffs.find((staff) => staff.uid === uid) || null;
  }

  /**
   * Change staff password
   */
  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const staff = await this.getById(id);
    if (!staff) {
      throw new Error("Staff not found");
    }

    const email = normalizeLoginEmail(staff.email);
    await changePassword(email, currentPassword, newPassword);

    await mutate({
      action: "update",
      path: `users/${id}`,
      data: {
        password: newPassword,
        email,
      },
      actionBy: "admin",
    });
  }

  async resetPasswordAdmin(
    id: string,
    newPassword: string,
    currentPassword?: string,
  ): Promise<void> {
    try {
      const response = await fetch("/api/staff/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: id, newPassword }),
      });

      if (response.ok) {
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (response.status !== 503) {
        throw new Error(payload.error || "Failed to reset password");
      }
    } catch (error) {
      if (
        error instanceof Error &&
        !error.message.includes("not available on this server")
      ) {
        throw error;
      }
    }

    const staff = await this.getById(id);
    if (!staff) {
      throw new Error("Staff not found");
    }

    const email = normalizeLoginEmail(staff.email || "");
    if (!email) {
      throw new Error("Staff email is missing on the profile.");
    }

    const knownCurrentPassword = currentPassword?.trim() || staff.password?.trim();
    if (!knownCurrentPassword) {
      throw new Error(
        "Enter the staff member's current password below, or configure Firebase Admin in .env.local (FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY) to reset without it.",
      );
    }

    try {
      await changePassword(email, knownCurrentPassword, newPassword);
    } catch (error) {
      if (isAuthRateLimited(error)) {
        throw new Error(
          "Too many failed attempts — this email is temporarily locked by Firebase. Wait 15–30 minutes, then try again. To reset immediately, add Firebase Admin credentials to .env.local and retry without a current password.",
        );
      }

      const message =
        error instanceof Error ? error.message.toLowerCase() : "";

      if (
        message.includes("invalid-credential") ||
        message.includes("wrong-password")
      ) {
        throw new Error(
          "The current password is incorrect in Firebase. Configure Firebase Admin credentials in .env.local to force-reset this account.",
        );
      }

      throw new Error(getAuthErrorMessage(error, "Failed to reset password."));
    }

    await mutate({
      action: "update",
      path: `users/${id}`,
      data: {
        password: newPassword,
        email,
      },
      actionBy: "admin",
    });
  }

  async markIdCardPrinted(staffIds: string[]): Promise<number> {
    const uniqueIds = [...new Set(staffIds.filter(Boolean))];
    if (uniqueIds.length === 0) return 0;

    const nowISO = new Date().toISOString();
    let updatedCount = 0;

    for (const staffId of uniqueIds) {
      await mutate({
        action: "update",
        path: `users/${staffId}`,
        data: {
          idCardPrintedAt: nowISO,
          updatedAt: nowISO,
        },
        actionBy: "admin",
      });
      updatedCount += 1;
    }

    return updatedCount;
  }

  async clearIdCardPrinted(staffIds: string[]): Promise<number> {
    const uniqueIds = [...new Set(staffIds.filter(Boolean))];
    if (uniqueIds.length === 0) return 0;

    const nowISO = new Date().toISOString();
    let updatedCount = 0;

    for (const staffId of uniqueIds) {
      await mutate({
        action: "update",
        path: `users/${staffId}`,
        data: {
          idCardPrintedAt: null,
          updatedAt: nowISO,
        },
        actionBy: "admin",
      });
      updatedCount += 1;
    }

    return updatedCount;
  }
}

export const staffService = new StaffService();
