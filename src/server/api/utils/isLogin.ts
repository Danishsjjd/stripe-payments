import "server-only";

import { auth } from "firebase-admin";
import { cookies } from "next/headers";
import { initFirebaseAdminApp } from "~/lib/firebase-admin-config";

// Init the Firebase SDK every time the server is called
initFirebaseAdminApp();

export const isLogin = async () => {
  const session = cookies().get("session")?.value;
  if (!session) return false;

  const decodedClaims = await auth().verifySessionCookie(session, true);
  if (!decodedClaims) return false;

  return decodedClaims;
};
