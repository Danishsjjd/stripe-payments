"use client";
import { type DecodedIdToken } from "firebase-admin/auth";
import { type ReactNode, createContext, useContext } from "react";
import { env } from "~/env";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

type AppContext = null | {
  user: DecodedIdToken;
};

const AppContext = createContext<AppContext>(null);
const stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);

const AppProvider = ({
  children,
  user,
}: {
  user: DecodedIdToken;
  children: ReactNode;
}) => (
  <Elements stripe={stripePromise}>
    <AppContext.Provider value={{ user }}>{children}</AppContext.Provider>
  </Elements>
);
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("please call useAppContext inside AppProvider");

  return context;
};

export default AppProvider;
