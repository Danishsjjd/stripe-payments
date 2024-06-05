import { redirect } from "next/navigation";
import { type ReactNode } from "react";
import { isLogin } from "~/server/api/trpc";
import AppProvider from "../../context/app";
import Header from "./header";

const layout = async ({ children }: { children: ReactNode }) => {
  const user = await isLogin();
  if (!user) return redirect("/auth");

  return (
    <AppProvider user={user}>
      <Header />
      <main className="p-5">{children}</main>
    </AppProvider>
  );
};

export default layout;
