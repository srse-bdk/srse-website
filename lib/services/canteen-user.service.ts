import { getArrFromObj } from "@ashirbad/js-core";
import { createUser, mutate } from "@atechhub/firebase";
import type { User } from "@/lib/types/user.type";

export interface CanteenAccountInput {
  name: string;
  email: string;
  password: string;
}

class CanteenUserService {
  async getAll(): Promise<User[]> {
    const data = await mutate({ action: "get", path: "users" });
    const users = getArrFromObj(data || {}) as unknown as User[];
    return users.filter((user) => user.role === "canteen");
  }

  async create(data: CanteenAccountInput, actionBy = "admin"): Promise<string> {
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
        role: "canteen",
        status: "active",
        position: "Canteen",
        staffType: "non-teaching",
        hasLogin: true,
      },
      actionBy,
    });

    return userId || authResponse.localId;
  }
}

export const canteenUserService = new CanteenUserService();
