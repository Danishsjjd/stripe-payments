"use client";

import { auth } from "~/lib/firebase-config";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";

const LogoutButton = () => {
  const router = useRouter();

  async function signOutUser() {
    //Sign out with the Firebase client
    await signOut(auth);

    //Clear the cookies in the server
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (response.status === 200) {
      router.push("/auth");
    }
  }

  return <Button onClick={signOutUser}>sign out</Button>;
};

export default LogoutButton;
