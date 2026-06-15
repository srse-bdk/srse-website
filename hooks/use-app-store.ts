import { create } from "zustand";
import type { User } from "@/lib/types/user.type";

interface AppStore {
  user: User | null;
  authReady: boolean;
  setUser: (user: User | null) => void;
  setAuthReady: (ready: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  authReady: false,
  setUser: (user) => set({ user }),
  setAuthReady: (authReady) => set({ authReady }),
}));
