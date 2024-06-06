"use client";

import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { type PaymentMethod } from "@stripe/stripe-js";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState, type FormEvent } from "react";
import type Stripe from "stripe";
import { Button } from "~/components/ui/button";
import { classes } from "~/data/classes";
import { auth, fireStore } from "~/lib/firebase-config";
import { api } from "~/trpc/react";

function UserData() {
  const user = auth.currentUser;

  const [data, setData] = useState<Record<string, string>>({});

  // Subscribe to the user's data in Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(collection(fireStore, "users"), user?.uid),
      (doc) => {
        const data = doc.data();
        data && setData(data);
      },
    );

    return () => unsubscribe();
  }, [user?.uid]);

  return (
    <div className={classes.gridContainer}>
      <p className={classes.gridLeftItem}>Stripe Customer ID:</p>{" "}
      <pre>{data.stripeCustomerId}</pre>
      <p className={classes.gridLeftItem}>Subscriptions:</p>{" "}
      <pre>{JSON.stringify(data.activePlans ?? [])}</pre>
    </div>
  );
}

const SubscriptionsPage = () => {
  const stripe = useStripe();
  const elements = useElements();
  const user = auth.currentUser;

  const [plan, setPlan] = useState<string>();
  const subscriptions = api.stripe.subscriptions.useQuery();

  const subscribe = api.stripe.subscribe.useMutation();
  const cancelSubscription = api.stripe.cancelSubscription.useMutation();

  // Cancel a subscription
  const cancel = async (id: string) => {
    await cancelSubscription.mutateAsync({ subscriptionId: id });
    await subscriptions.refetch();
    alert("canceled!");
  };

  // Handle the submission of card details
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const cardElement = elements?.getElement(CardElement);
    if (!cardElement) return;

    // Create Payment Method
    const res = await stripe?.createPaymentMethod({
      type: "card",
      card: cardElement,
    });

    if (res?.error ?? !res) {
      alert(res?.error.message);
      return;
    }

    const { paymentMethod } = res as { paymentMethod: PaymentMethod };

    // Create Subscription on the Server
    const subscription = await subscribe.mutateAsync({
      payment_method: paymentMethod.id,
      plan,
    });

    // The subscription contains an invoice
    // If the invoice's payment succeeded then you're good,
    // otherwise, the payment intent must be confirmed

    const { latest_invoice } = subscription;

    console.log(latest_invoice, subscription);
  };

  return (
    <>
      <h2 className={classes.pageTitle}>Subscriptions</h2>
      <p className={classes.pageDescription}>
        Subscribe a user to a recurring plan, process the payment, and sync with
        Firestore in realtime.
      </p>

      <div className={classes.container}>
        <h2 className={classes.title}>Firestore Data</h2>
        <p className={classes.description}>User&apos;s data in Firestore.</p>
        {user?.uid && <UserData />}
      </div>

      <div className={`${classes.container} space-y-4`}>
        <h3 className={classes.title}>Step 1: Choose a Plan</h3>

        <Button
          variant={
            plan === "price_1POeLOILBMX0Pjyj109FxDmf" ? "default" : "secondary"
          }
          onClick={() => setPlan("price_1POeLOILBMX0Pjyj109FxDmf")}
          className="mr-4"
        >
          Choose Monthly $25/m
        </Button>

        <Button
          variant={
            plan === "price_1POeM7ILBMX0PjyjFiO5IugP" ? "default" : "secondary"
          }
          onClick={() => setPlan("price_1POeM7ILBMX0PjyjFiO5IugP")}
        >
          Choose Quarterly $50/q
        </Button>

        <p>
          Selected Plan: <strong>{plan}</strong>
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className={classes.container}
        hidden={!plan}
      >
        <h3 className={classes.title}>Step 2: Submit a Payment Method</h3>
        <p className={classes.description}>Collect credit card details</p>
        <div className={classes.gridContainer}>
          <p className={classes.gridLeftItem}>Normal Card:</p>{" "}
          <code>4242424242424242</code>
          <p className={classes.gridLeftItem}>3D Secure Card:</p>{" "}
          <code>4000002500003155</code>
        </div>

        <div className="flex gap-4">
          <CardElement />
          <Button>Subscribe & Pay</Button>
        </div>
      </form>

      <div className={classes.container}>
        <h3>Manage Current Subscriptions</h3>
        <div>
          {subscriptions.data?.data?.map((sub) => (
            <div className={classes.gridContainer} key={sub.id}>
              <Button
                size={"sm"}
                onClick={() => cancel(sub.id)}
                className={`${classes.gridLeftItem} h-auto`}
                variant={"outline"}
              >
                Cancel
              </Button>
              <pre>
                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                {/* @ts-expect-error */}
                Next payment of {(sub.plan as Stripe.Plan).amount} due{" "}
                {new Date(sub.current_period_end * 1000).toUTCString()}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default SubscriptionsPage;
