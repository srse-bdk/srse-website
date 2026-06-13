import {
  firebaseAdminConfig,
  isFirebaseAdminConfigured,
} from "@/lib/env";

let admin: typeof import("firebase-admin") | null = null;

async function getAdmin() {
  if (!admin) {
    admin = await import("firebase-admin");
  }
  return admin;
}

export async function getFirebaseAdminMessaging() {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  const firebaseAdmin = await getAdmin();
  let app: ReturnType<typeof firebaseAdmin.app>;

  if (firebaseAdmin.apps.length === 0) {
    app = firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert({
        projectId: firebaseAdminConfig.projectId,
        clientEmail: firebaseAdminConfig.clientEmail,
        privateKey: firebaseAdminConfig.privateKey,
      }),
      projectId: firebaseAdminConfig.projectId,
    });
  } else {
    app = firebaseAdmin.app();
  }

  return firebaseAdmin.messaging(app);
}
