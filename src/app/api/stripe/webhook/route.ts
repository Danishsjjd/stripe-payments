import { firestore } from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { env } from "~/env";
import { initFirebaseAdminApp } from "~/lib/firebase-admin-config";
import { stripe } from "~/lib/stripe";

initFirebaseAdminApp();

const webhookHandler: Partial<
  Record<Stripe.Event.Type, (event: never) => Promise<unknown>>
> = {
  "customer.subscription.deleted": async (data: Stripe.Subscription) => {
    const customer = (await stripe.customers.retrieve(
      data.customer as string,
    )) as Stripe.Customer;

    const userId = customer.metadata.firestoreUID;
    const db = getFirestore();
    const userRef = db.collection("users").doc(userId!);

    await userRef.update({
      activePlans: firestore.FieldValue.arrayRemove(data.id),
    });
  },
  "customer.subscription.created": async (data: Stripe.Subscription) => {
    const customer = (await stripe.customers.retrieve(
      data.customer as string,
    )) as Stripe.Customer;
    const userId = customer.metadata.firestoreUID;
    const db = getFirestore();
    const userRef = db.collection("users").doc(userId!);

    await userRef.update({
      activePlans: firestore.FieldValue.arrayUnion(data.id),
    });
  },
};

export async function POST(req: Request) {
  const sig = headers().get("stripe-signature");
  const rawBody = await req.text();

  if (typeof sig !== "string" || !rawBody)
    return new Response("Signature or Buffer is missing/invalid", {
      status: 400,
    });

  const event = stripe.webhooks.constructEvent(
    rawBody,
    sig,
    env.STRIPE_WEBHOOK_SECRETS,
  );

  try {
    const currentWebhookHandler = webhookHandler[event.type];
    if (typeof currentWebhookHandler === "function") {
      console.error(`✅ Event \`${event.type}\` is supported`);
      event.data.object;
      await currentWebhookHandler(event.data.object as never);
      return new Response("", { status: 200 });
    } else {
      console.error(`❌ Event \`${event.type}\` is not supported`);
      return new Response("", { status: 200 });
    }
  } catch (e) {
    console.error("Webhooks Error:", e);
    return new Response("", { status: 400 });
  }
}
