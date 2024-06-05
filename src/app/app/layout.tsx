import { type ReactNode } from "react";
import AppProvider from "../../context/app";
import { api } from "~/trpc/server";
import Header from "./header";

const layout = async ({ children }: { children: ReactNode }) => {
  const user = await api.auth.user();

  return (
    <AppProvider user={user}>
      <Header />
      <main className="p-5">{children}</main>
    </AppProvider>
  );
};

export default layout;
