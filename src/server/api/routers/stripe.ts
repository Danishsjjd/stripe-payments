import type Stripe from "stripe";
import { z } from "zod";
import { stripe } from "~/lib/stripe";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { paymentForm } from "~/app/app/payment/paymentFormSchema";
import { initFirebaseAdminApp } from "~/lib/firebase-admin-config";
import { getFirestore } from "firebase-admin/firestore";

const WEBAPP_URL = "http://localhost:3000";
initFirebaseAdminApp();

async function upsertCustomer(
  userId: string,
  params?: Stripe.CustomerCreateParams,
) {
  const userSnapshot = await getFirestore()
    .collection("users")
    .doc(userId)
    .get();

  const data = userSnapshot.data();

  const { stripeCustomerId, email } = data
    ? data
    : { stripeCustomerId: "", email: "" };

  if (stripeCustomerId) {
    return stripe.customers.retrieve(
      stripeCustomerId as string,
    ) as Promise<Stripe.Customer>;
  } else {
    const customer = await stripe.customers.create({
      ...params,
      email: email as string,
      metadata: {
        firestoreUID: userId,
      },
    });

    await userSnapshot.ref.update({ stripeCustomerId: customer.id });

    return customer;
  }
}

async function createSetupIntent({ userId }: { userId: string }) {
  const customer = await upsertCustomer(userId);

  return stripe.setupIntents.create({
    customer: customer.id,
  });
}

const listPaymentMethods = async ({ userId }: { userId: string }) => {
  const customer = await upsertCustomer(userId);

  return stripe.paymentMethods.list({ customer: customer.id, type: "card" });
};

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
  wallets: protectedProcedure.query(
    async ({ ctx }) =>
      (await listPaymentMethods({ userId: ctx.user.uid })).data,
  ),
  wallet: protectedProcedure.mutation(({ ctx }) =>
    createSetupIntent({ userId: ctx.user.uid }),
  ),
});
