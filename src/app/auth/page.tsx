"use client";
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithRedirect,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { auth } from "~/lib/firebase-config";

const LoginPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getRedirectResult(auth).then(async (userCred) => {
      setLoading(false);
      if (!userCred) {
        return;
      }
      setLoading(true);
      void fetch("/api/auth", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await userCred.user.getIdToken()}`,
        },
      }).then((response) => {
        if (response.status === 200) {
          router.push("/app");
        } else {
          setLoading(false);
        }
      });
    });
  }, [router]);

  const handleGoogleAuth = () => {
    const provider = new GoogleAuthProvider();

    void signInWithRedirect(auth, provider);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      {loading ? (
        <Skeleton className="h-[40px] w-[141px] rounded-md" />
      ) : (
        <Button variant={"ringHover"} onClick={handleGoogleAuth}>
          Sign with google
        </Button>
      )}
    </main>
  );
};

export default LoginPage;
