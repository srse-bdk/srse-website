import {
  firebaseAdminConfig,
  firebaseConfig,
  isFirebaseAdminConfigured,
} from "@/lib/env";

let admin: typeof import("firebase-admin") | null = null;

async function getAdminModule() {
  if (!admin) {
    admin = await import("firebase-admin");
  }
  return admin;
}

export async function getFirebaseAdminApp() {
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase Admin SDK is not configured");
  }

  const firebaseAdmin = await getAdminModule();

  if (firebaseAdmin.apps.length === 0) {
    return firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert({
        projectId: firebaseAdminConfig.projectId,
        clientEmail: firebaseAdminConfig.clientEmail,
        privateKey: firebaseAdminConfig.privateKey,
      }),
      projectId: firebaseAdminConfig.projectId,
      databaseURL: firebaseConfig.databaseURL,
    });
  }

  return firebaseAdmin.app();
}

export async function getFirebaseAdminDatabase() {
  const app = await getFirebaseAdminApp();
  const firebaseAdmin = await getAdminModule();
  return firebaseAdmin.database(app);
}

export async function getRealtimeValue(path: string): Promise<unknown> {
  const database = await getFirebaseAdminDatabase();
  const snapshot = await database.ref(path).once("value");
  return snapshot.val();
}

export async function updateRealtime(
  path: string,
  data: Record<string, unknown>,
) {
  const database = await getFirebaseAdminDatabase();
  await database.ref(path).update(data);
}

export async function getFirebaseAdminMessaging() {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  const app = await getFirebaseAdminApp();
  const firebaseAdmin = await getAdminModule();
  return firebaseAdmin.messaging(app);
}
