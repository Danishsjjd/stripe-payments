"use client";
import { useAppContext } from "~/context/app";

const HomePage = () => {
  const { user } = useAppContext();

  return <p>Hello 👋, {user.name || user.email}</p>;
};

export default HomePage;
