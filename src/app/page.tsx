import { redirect } from "next/navigation";

const HomePage = async () => {
  redirect("/app");
};

export default HomePage;
