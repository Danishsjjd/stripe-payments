import type Stripe from "stripe";
import { z } from "zod";
import { stripe } from "~/lib/stripe";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { paymentForm } from "~/app/app/payment/paymentFormSchema";
import { initFirebaseAdminApp } from "~/lib/firebase-admin-config";
import { getFirestore } from "firebase-admin/firestore";

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

async function listPaymentMethods({ userId }: { userId: string }) {
  const customer = await upsertCustomer(userId);

  return stripe.paymentMethods.list({ customer: customer.id, type: "card" });
}

/**
 * Attaches a payment method to the Stripe customer,
 * subscribes to a Stripe plan, and saves the plan to Firestore
 */
async function createSubscription(
  userId: string,
  plan: string,
  payment_method: string,
) {
  const customer = await upsertCustomer(userId);

  // Attach the  payment method to the customer
  await stripe.paymentMethods.attach(payment_method, { customer: customer.id });

  // (optional: user can have default payment method) Set it as the default payment method
  // it will create a new payment method every time so be careful to call it
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: payment_method },
  });

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ plan }],
    expand: ["latest_invoice.payment_intent"],
  });

  // ! (can be handled by webhook) Update the user's status
  // const invoice = subscription.latest_invoice as Stripe.Invoice;
  // const payment_intent = invoice.payment_intent as Stripe.PaymentIntent;
  // if (payment_intent.status === "succeeded") {
  //   const userSnapshot = getFirestore();
  //   await userSnapshot
  //     .collection("users")
  //     .doc(userId)
  //     .set(
  //       {
  //         stripeCustomerId: customer.id,
  //         activePlans: firestore.FieldValue.arrayUnion(subscription.id),
  //       },
  //       { merge: true },
  //     );
  // }

  return subscription;
}

/**
 * Cancels an active subscription, syncs the data in Firestore
 */
async function cancelSubscription(userId: string, subscriptionId: string) {
  const customer = await upsertCustomer(userId);
  if (customer.metadata.firestoreUID !== userId) {
    throw Error("Firebase UID does not match Stripe Customer");
  }

  const subscription = await stripe.subscriptions.cancel(subscriptionId);

  // ! (can be handled by webhook) Cancel at end of period
  // const subscription = stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  // if (subscription.status === "canceled") {
  //   const userSnapshot = getFirestore();

  //   await userSnapshot
  //     .collection("users")
  //     .doc(userId)
  //     .update({
  //       activePlans: firestore.FieldValue.arrayRemove(subscription.id),
  //     });
  // }

  return subscription;
}

/**
 * Returns all the subscriptions linked to a Firebase userID in Stripe
 */
async function listSubscriptions(userId: string) {
  const customer = await upsertCustomer(userId);
  const subscriptions = await stripe.subscriptions.list({
    customer: customer.id,
  });

  return subscriptions;
}

export const stripeRouter = createTRPCRouter({
  checkout: protectedProcedure
    .input(z.object({ line_items: z.any(), WEBAPP_URL: z.string() }))
    .mutation(({ input }) => {
      const { line_items } = input as {
        line_items: Stripe.Checkout.SessionCreateParams.LineItem[];
      };

      return stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items,
        mode: "payment",
        success_url: `${input.WEBAPP_URL}/app/checkout?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${input.WEBAPP_URL}/app/checkout?session_id={CHECKOUT_SESSION_ID}&success=false`,
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
  subscriptions: protectedProcedure.query(({ ctx }) =>
    listSubscriptions(ctx.user.uid),
  ),
  subscribe: protectedProcedure
    .input(z.object({ plan: z.any(), payment_method: z.any() }))
    .mutation(({ ctx, input }) =>
      createSubscription(
        ctx.user.uid,
        input.plan as string,
        input.payment_method as string,
      ),
    ),
  cancelSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .mutation(({ ctx, input }) =>
      cancelSubscription(ctx.user.uid, input.subscriptionId),
    ),
});
