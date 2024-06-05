import { getApps, initializeApp } from "firebase-admin/app";

export function initFirebaseAdminApp() {
  if (getApps().length <= 0) {
    initializeApp();
  }
}
