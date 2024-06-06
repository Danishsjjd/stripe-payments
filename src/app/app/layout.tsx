import { redirect } from "next/navigation";
import { type ReactNode } from "react";
import AppProvider from "~/context/app";
import Header from "./header";
import { isLogin } from "~/server/api/utils/isLogin";

const layout = async ({ children }: { children: ReactNode }) => {
  const user = await isLogin();
  if (!user) return redirect("/auth");

  return (
    <AppProvider user={user}>
      <Header />
      <main className="mx-auto max-w-2xl p-8 text-center">{children}</main>
    </AppProvider>
  );
};

export default layout;
