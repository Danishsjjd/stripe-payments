import { auth } from "firebase-admin";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { initFirebaseAdminApp } from "~/lib/firebase-admin-config";
import { getFirestore } from "firebase-admin/firestore";

// Init the Firebase SDK every time the server is called
initFirebaseAdminApp();

export async function POST() {
  const authorization = headers().get("Authorization");
  const idToken = authorization?.split("Bearer ")[1];

  if (!idToken) return NextResponse.json({}, { status: 400 });

  const decodedToken = await auth().verifyIdToken(idToken);

  if (!decodedToken) return NextResponse.json({}, { status: 400 });

  //Generate session cookie
  const expiresIn = 60 * 60 * 24 * 5 * 1000;
  const sessionCookie = await auth().createSessionCookie(idToken, {
    expiresIn,
  });
  const options = {
    name: "session",
    value: sessionCookie,
    maxAge: expiresIn,
    httpOnly: true,
    secure: true,
  };

  //Add the cookie to the browser
  cookies().set(options);

  const firestore = getFirestore();

  await firestore
    .collection("users")
    .doc(decodedToken.uid)
    .set({ email: decodedToken.email }, { merge: true });

  return NextResponse.json({}, { status: 200 });
}
