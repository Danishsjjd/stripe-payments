import { cert, getApps, initializeApp } from "firebase-admin/app";
import { env } from "~/env";

export function initFirebaseAdminApp() {
  if (getApps().length <= 0) {
    initializeApp({
      credential: cert({
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY,
        projectId: env.FIREBASE_PROJECT_ID,
      }),
    });
  }
}
