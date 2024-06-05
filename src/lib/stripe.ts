import Stripe from "stripe";
import { env } from "~/env";

export const stripe = new Stripe(env.STRIPE_SECRET, {
  apiVersion: "2024-04-10",
});
