import { getArrFromObj } from "@ashirbad/js-core";
import { createUser, mutate } from "@atechhub/firebase";
import type { User } from "@/lib/types/user.type";

export interface ScannerAccountInput {
  name: string;
  email: string;
  password: string;
}

class ScannerUserService {
  async getAll(): Promise<User[]> {
    const data = await mutate({ action: "get", path: "users" });
    const users = getArrFromObj(data || {}) as unknown as User[];
    return users.filter((user) => user.role === "scanner");
  }

  async create(data: ScannerAccountInput, actionBy = "admin"): Promise<string> {
    const existing = await mutate({ action: "get", path: "users" });
    const users = getArrFromObj(existing || {}) as unknown as User[];
    const emailTaken = users.some(
      (user) => user.email?.toLowerCase() === data.email.trim().toLowerCase(),
    );
    if (emailTaken) {
      throw new Error("Email already in use");
    }

    const authResponse = await createUser(data.email.trim(), data.password);

    const userId = await mutate({
      action: "create",
      path: `users/${authResponse.localId}`,
      data: {
        uid: authResponse.localId,
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
        role: "scanner",
        status: "active",
        position: "Gate Scanner",
        staffType: "non-teaching",
        hasLogin: true,
      },
      actionBy,
    });

    return userId || authResponse.localId;
  }
}

export const scannerUserService = new ScannerUserService();
