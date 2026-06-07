import { mutate } from "@atechhub/firebase";
import type { Student } from "@/lib/types/student.type";
import type { User } from "@/lib/types/user.type";

function randomToken(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < length; i += 1) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export async function scanIdExists(scanId: string): Promise<boolean> {
  const [usersRaw, studentsRaw] = await Promise.all([
    mutate({ action: "get", path: "users" }),
    mutate({ action: "get", path: "students" }),
  ]);

  const users = Object.values((usersRaw || {}) as Record<string, User>);
  const students = Object.values((studentsRaw || {}) as Record<string, Student>);

  const normalized = scanId.toUpperCase();
  const existsInUsers = users.some(
    (user) => String(user?.scanId || "").toUpperCase() === normalized,
  );
  const existsInStudents = students.some(
    (student) => String(student?.scanId || "").toUpperCase() === normalized,
  );

  return existsInUsers || existsInStudents;
}

export async function ensureUniqueScanId(scanId: string): Promise<string> {
  const normalized = scanId.trim().toUpperCase();
  if (!normalized) {
    throw new Error("Scan ID cannot be empty");
  }

  const exists = await scanIdExists(normalized);
  if (exists) {
    throw new Error(`Scan ID already exists: ${normalized}`);
  }

  return normalized;
}

export async function generateUniqueScanId(
  prefix: "STF" | "STU",
): Promise<string> {
  for (let attempts = 0; attempts < 10; attempts += 1) {
    const candidate = `${prefix}-${randomToken(8)}`;
    const exists = await scanIdExists(candidate);
    if (!exists) {
      return candidate;
    }
  }

  throw new Error("Failed to generate a unique scan ID. Please try again.");
}

export async function backfillMissingScanIds(): Promise<{
  usersUpdated: number;
  studentsUpdated: number;
}> {
  const [usersRaw, studentsRaw] = await Promise.all([
    mutate({ action: "get", path: "users" }),
    mutate({ action: "get", path: "students" }),
  ]);

  const users = usersRaw as Record<string, User> | null;
  const students = studentsRaw as Record<string, Student> | null;

  let usersUpdated = 0;
  let studentsUpdated = 0;

  for (const [id, user] of Object.entries(users || {})) {
    if (!user) continue;
    const role = user.role;
    if (role !== "staff" && role !== "student") continue;
    if (String(user.scanId || "").trim()) continue;

    const prefix = role === "staff" ? "STF" : "STU";
    const scanId = await generateUniqueScanId(prefix);

    await mutate({
      action: "update",
      path: `users/${id}`,
      data: { scanId },
      actionBy: "admin",
    });
    usersUpdated += 1;
  }

  for (const [id, student] of Object.entries(students || {})) {
    if (!student) continue;
    if (String(student.scanId || "").trim()) continue;

    const scanId = await generateUniqueScanId("STU");

    await mutate({
      action: "update",
      path: `students/${id}`,
      data: { scanId },
      actionBy: "admin",
    });
    studentsUpdated += 1;
  }

  return { usersUpdated, studentsUpdated };
}
