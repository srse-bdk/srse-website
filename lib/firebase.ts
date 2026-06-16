import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "./env";

export function ensureFirebaseClient() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getApp();
}

const app = ensureFirebaseClient();
export const db = getDatabase(app);
export const auth = getAuth(app);
export default app;
