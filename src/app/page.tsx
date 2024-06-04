"use client";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Button } from "~/components/ui/button";
import { auth } from "~/data/firebase";

export default function Home() {
  const handleGoogleAuth = () => {
    const provider = new GoogleAuthProvider();

    void signInWithPopup(auth, provider);
  };
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <Button variant={"ringHover"} onClick={handleGoogleAuth}>
        Sign with google
      </Button>
    </main>
  );
}
