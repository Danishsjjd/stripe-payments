import { api } from "~/trpc/server";
import LogoutButton from "../_components/logout";

const page = async () => {
  const user = await api.auth.user();
  return (
    <div className="grid h-svh w-svw place-items-center content-center gap-4">
      <LogoutButton />
      <p>{user.email}</p>
    </div>
  );
};

export default page;
