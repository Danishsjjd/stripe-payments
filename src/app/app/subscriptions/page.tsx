"use client";

import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { type PaymentMethod } from "@stripe/stripe-js";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type Stripe from "stripe";
import StripeCards from "~/components/StripeCards";
import { Button } from "~/components/ui/button";
import { useAppContext } from "~/context/app";
import { classes } from "~/data/classes";
import { env } from "~/env";
import { fireStore } from "~/lib/firebase-config";
import { api } from "~/trpc/react";

const SubscriptionsPage = () => {
  const stripe = useStripe();
  const elements = useElements();

  const [plan, setPlan] = useState<string>();
  const subscriptions = api.stripe.subscriptions.useQuery();

  const subscribe = api.stripe.subscribe.useMutation();
  const cancelSubscription = api.stripe.cancelSubscription.useMutation();

  const cancelSubscriptionSubmit = async (id: string) => {
    setLoading(true);
    try {
      await cancelSubscription.mutateAsync({ subscriptionId: id });
      toast.success("canceled!");
      await subscriptions.refetch();
    } finally {
      setLoading(false);
    }
  };

  const [loading, setLoading] = useState(false);
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const cardElement = elements?.getElement(CardElement);
    if (!cardElement) return;

    setLoading(true);
    try {
      const res = await stripe?.createPaymentMethod({
        type: "card",
        card: cardElement,
      });

      if (res?.error ?? !res) {
        toast.error(res?.error.message);
        return;
      }

      const { paymentMethod } = res as { paymentMethod: PaymentMethod };

      const subscription = await subscribe.mutateAsync({
        payment_method: paymentMethod.id,
        plan,
      });
      toast.success("successfully subscribed!");
      await subscriptions.refetch();

      // The subscription contains an invoice
      // If the invoice's payment succeeded then you're good,
      // otherwise, the payment intent must be confirmed
      const { latest_invoice } = subscription;

      console.info(latest_invoice, subscription);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className={classes.pageTitle}>Subscriptions</h2>
      <p className={classes.pageDescription}>
        Subscribe a user to a recurring plan, process the payment, and sync with
        Firestore in realtime.
      </p>

      <UserData />

      <div className={`${classes.container} space-y-4`}>
        <h3 className={classes.title}>Step 1: Choose a Plan</h3>

        <Button
          variant={
            plan === env.NEXT_PUBLIC_MONTHLY_PLAN_ID ? "default" : "secondary"
          }
          onClick={() => setPlan(env.NEXT_PUBLIC_MONTHLY_PLAN_ID)}
          className="mr-4"
        >
          Choose Monthly $25/m
        </Button>

        <Button
          variant={
            plan === env.NEXT_PUBLIC_QUARTERLY_PLAN_ID ? "default" : "secondary"
          }
          onClick={() => setPlan(env.NEXT_PUBLIC_QUARTERLY_PLAN_ID)}
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
        <StripeCards />

        <div className="flex gap-4">
          <CardElement />
          <Button disabled={loading}>Subscribe & Pay</Button>
        </div>
      </form>

      <div className={classes.container}>
        <h3>Manage Current Subscriptions</h3>
        <div>
          {subscriptions.data?.data?.map((sub) => (
            <div className={classes.gridContainer} key={sub.id}>
              <Button
                size={"sm"}
                onClick={() => cancelSubscriptionSubmit(sub.id)}
                className={`${classes.gridLeftItem} h-auto`}
                variant={"outline"}
                disabled={loading}
              >
                Cancel
              </Button>
              <pre>
                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                {/* @ts-expect-error */}
                Next payment of {(sub?.plan as Stripe.Plan)?.amount} due{" "}
                {new Date(sub.current_period_end * 1000).toUTCString()}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

const UserData = () => {
  const { user } = useAppContext();

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
    <div className={classes.container}>
      <h2 className={classes.title}>Firestore Data</h2>
      <p className={classes.description}>User&apos;s data in Firestore.</p>

      <div className={classes.gridContainer}>
        <p className={classes.gridLeftItem}>Stripe Customer ID:</p>{" "}
        <pre>{data.stripeCustomerId}</pre>
        <p className={classes.gridLeftItem}>Subscriptions:</p>{" "}
        <pre>{JSON.stringify(data.activePlans ?? [])}</pre>
      </div>
    </div>
  );
};

export default SubscriptionsPage;
