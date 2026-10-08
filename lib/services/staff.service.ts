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
import { staffLeaveAccrualService } from "./staff-leave-accrual.service";

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
        dateOfJoining: data.dateOfJoining || null,
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

  /**
   * Replace a leaving staff member with a new profile.
   * Copies class/subject assignments and rewrites timetable slots (+ legacy
   * subject.staffId). Does NOT copy leave applications or leave accruals.
   * Deactivates the outgoing staff and clears their assignments.
   */
  async replaceStaff(params: {
    outgoingStaffId: string;
    name: string;
    email: string;
    password: string;
    phoneNumber?: string;
    gender?: "male" | "female" | "other";
    bloodGroup?: User["bloodGroup"];
    /** yyyy-MM-dd or ISO */
    dateOfJoining?: string;
  }): Promise<{
    newStaffId: string;
    copiedAssignments: number;
    timetableSlotsUpdated: number;
    subjectsUpdated: number;
  }> {
    const outgoing = await this.getById(params.outgoingStaffId);
    if (!outgoing) throw new Error("Outgoing staff not found");
    if (outgoing.status === "inactive") {
      throw new Error("Outgoing staff is already inactive");
    }

    const email = normalizeLoginEmail(params.email);
    const existing = await this.getByEmail(email);
    if (existing) {
      throw new Error(`Email ${email} is already used by ${existing.name}`);
    }

    const joining =
      params.dateOfJoining && /^\d{4}-\d{2}-\d{2}/.test(params.dateOfJoining)
        ? `${params.dateOfJoining.slice(0, 10)}T12:00:00.000Z`
        : params.dateOfJoining;

    const assignments = [...(outgoing.subjectAssignments || [])];
    const { userId, authResponse } = await this.create({
      name: params.name.trim(),
      email,
      password: params.password,
      role: "staff",
      gender: params.gender || outgoing.gender || "female",
      bloodGroup: params.bloodGroup ?? outgoing.bloodGroup,
      position: outgoing.position || "Teacher",
      staffType: outgoing.staffType || "teaching",
      phoneNumber: params.phoneNumber?.trim() || undefined,
      dateOfJoining: joining,
      subjectAssignments: assignments,
    });
    // Prefer Auth UID — mutate("create") with an explicit path may not return the id.
    const newStaffId =
      authResponse.localId || userId || "";
    if (!newStaffId) {
      throw new Error("Failed to resolve new staff id after create");
    }

    // Timetable slots: swap staffId / staffName where they pointed at outgoing.
    const timeTablesRaw = await mutate({
      action: "get",
      path: "time-tables",
      actionBy: "admin",
    });
    const timeTables = getArrFromObj(timeTablesRaw || {}) as Array<{
      id: string;
      schedule?: Record<string, Array<Record<string, unknown>>>;
    }>;
    const outgoingName = (outgoing.name || "").trim().toLowerCase();
    let timetableSlotsUpdated = 0;
    for (const tt of timeTables) {
      if (!tt.schedule) continue;
      let changed = false;
      const nextSchedule: Record<string, Array<Record<string, unknown>>> = {};
      for (const [day, slots] of Object.entries(tt.schedule)) {
        nextSchedule[day] = (slots || []).map((slot) => {
          const slotStaffId = slot?.staffId != null ? String(slot.staffId) : "";
          const slotName = String(slot?.staffName || "")
            .trim()
            .toLowerCase();
          const matchesOutgoing =
            slotStaffId === params.outgoingStaffId ||
            (!slotStaffId && outgoingName && slotName === outgoingName);
          if (!matchesOutgoing) return slot;
          changed = true;
          timetableSlotsUpdated += 1;
          return {
            ...slot,
            staffId: newStaffId,
            staffName: params.name.trim(),
          };
        });
      }
      if (changed) {
        await mutate({
          action: "update",
          path: `time-tables/${tt.id}`,
          data: {
            schedule: nextSchedule,
            updatedAt: new Date().toISOString(),
          },
          actionBy: "admin",
        });
      }
    }

    // Legacy subject.staffId pointers.
    const subjectsRaw = await mutate({
      action: "get",
      path: "subjects",
      actionBy: "admin",
    });
    const subjects = getArrFromObj(subjectsRaw || {}) as Array<{
      id: string;
      staffId?: string;
    }>;
    let subjectsUpdated = 0;
    for (const subject of subjects) {
      if (subject.staffId !== params.outgoingStaffId) continue;
      await mutate({
        action: "update",
        path: `subjects/${subject.id}`,
        data: {
          staffId: newStaffId,
          updatedAt: new Date().toISOString(),
        },
        actionBy: "admin",
      });
      subjectsUpdated += 1;
    }

    // Deactivate outgoing — keep leave history on their profile; clear assignments.
    await this.update(params.outgoingStaffId, {
      status: "inactive",
      subjectAssignments: [],
    });

    // Fresh leave credits for the replacement from their joining date (not copied).
    if (joining) {
      await staffLeaveAccrualService.reconcileAccrualsForJoiningDate(
        newStaffId,
        joining,
        undefined,
        "admin",
      );
      await staffLeaveAccrualService.ensureQuarterlyAccrualsForStaff(
        newStaffId,
        undefined,
        "admin",
        joining,
      );
    } else {
      await staffLeaveAccrualService.ensureQuarterlyAccrualsForStaff(
        newStaffId,
        undefined,
        "admin",
      );
    }

    return {
      newStaffId,
      copiedAssignments: assignments.length,
      timetableSlotsUpdated,
      subjectsUpdated,
    };
  }
}

export const staffService = new StaffService();
