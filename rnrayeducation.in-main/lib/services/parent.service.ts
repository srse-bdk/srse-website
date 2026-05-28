import type { User, UserInput, UserUpdateInput } from "@/lib/types/user.type";
import { getArrFromObj } from "@ashirbad/js-core";
import {
  changePassword,
  createUser,
  deleteUser,
  mutate,
} from "@atechhub/firebase";

interface ParentInput
  extends Omit<UserInput, "role" | "position" | "staffType"> {
  validChildrenIds: string[];
}

interface ParentUpdateInput extends UserUpdateInput {
  validChildrenIds?: string[];
}

class ParentService {
  /**
   * Create a new parent (includes Firebase Auth user creation)
   */
  async create(data: ParentInput): Promise<{
    userId: string;
    authResponse: Awaited<ReturnType<typeof createUser>>;
  }> {
    // Step 1: Create Firebase Auth user
    const authResponse = await createUser(data.email, data.password);

    // Step 2: Create parent record in users database
    const userId = await mutate({
      action: "create",
      path: `users/${authResponse.localId}`,
      data: {
        uid: authResponse.localId,
        name: data.name,
        email: data.email,
        password: data.password,
        role: "parent",
        status: "active",
        gender: data.gender,
        validChildrenIds: data.validChildrenIds,
      },
      actionBy: "admin",
    });

    return { userId, authResponse };
  }

  /**
   * Get all parents
   */
  async getAll(): Promise<User[]> {
    const data = await mutate({
      action: "get",
      path: "users",
    });
    const allUsers = getArrFromObj(data || {}) as unknown as User[];
    return allUsers.filter((user) => user.role === "parent");
  }

  /**
   * Get a parent by ID
   */
  async getById(id: string): Promise<User | null> {
    const data = await mutate({
      action: "get",
      path: `users/${id}`,
    });
    const parent = data as unknown as User;
    return parent && parent.role === "parent" ? parent : null;
  }

  /**
   * Update a parent
   */
  async update(id: string, data: ParentUpdateInput): Promise<void> {
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
   * Delete a parent (includes Firebase Auth user deletion)
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
   * Delete a parent by ID only (uses stored password from database)
   */
  async deleteById(id: string): Promise<void> {
    const parent = await this.getById(id);
    if (!parent) {
      throw new Error("Parent not found");
    }

    if (!parent.email || !parent.password) {
      throw new Error("Parent email or password not available");
    }

    // Step 1: Delete Firebase Auth user using stored credentials
    await deleteUser(parent.email, parent.password);

    // Step 2: Delete database record
    await mutate({
      action: "delete",
      path: `users/${id}`,
      actionBy: "admin",
    });
  }

  /**
   * Get parent by email
   */
  async getByEmail(email: string): Promise<User | null> {
    const parents = await this.getAll();
    return parents.find((parent) => parent.email === email) || null;
  }

  /**
   * Get parent by Firebase UID
   */
  async getByFirebaseUid(uid: string): Promise<User | null> {
    const parents = await this.getAll();
    return parents.find((parent) => parent.uid === uid) || null;
  }

  /**
   * Change parent password
   */
  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const parent = await this.getById(id);
    if (!parent) {
      throw new Error("Parent not found");
    }

    await changePassword(parent.email, currentPassword, newPassword);
  }
}

export const parentService = new ParentService();
