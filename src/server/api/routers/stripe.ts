import type Stripe from "stripe";
import { z } from "zod";
import { stripe } from "~/lib/stripe";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { paymentForm } from "~/app/app/payment/paymentFormSchema";

const WEBAPP_URL = "http://localhost:3000";
export const stripeRouter = createTRPCRouter({
  checkout: protectedProcedure
    .input(z.object({ line_items: z.any() }))
    .mutation(({ input }) => {
      const { line_items } = input as {
        line_items: Stripe.Checkout.SessionCreateParams.LineItem[];
      };

      return stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items,
        mode: "payment",
        success_url: `${WEBAPP_URL}/app/checkout?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${WEBAPP_URL}/app/checkout?session_id={CHECKOUT_SESSION_ID}&success=false`,
      });
    }),
  payments: protectedProcedure
    .input(paymentForm)
    .mutation(({ input: { amount } }) => {
      return stripe.paymentIntents.create({
        amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
    }),
});
