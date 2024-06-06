"use client";

import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { PaymentMethod, SetupIntent } from "@stripe/stripe-js";
import { useState, type FormEvent } from "react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { classes } from "~/data/classes";
import { api } from "~/trpc/react";

const CustomersPage = () => {
  const element = useElements();
  const stripe = useStripe();

  const wallets = api.stripe.wallets.useQuery();
  const wallet = api.stripe.wallet.useMutation();

  const [setupIntent, setSetupIntents] = useState<SetupIntent | null>(null);
  const [loading, setLoading] = useState(false);

  const createSetupIntent = () =>
    wallet.mutate(undefined, {
      onSuccess(data) {
        setSetupIntents(data as SetupIntent);
      },
    });
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!setupIntent?.client_secret) return;

    const cardElement = element?.getElement(CardElement);
    if (!cardElement) return;

    setLoading(true);
    try {
      const res = await stripe?.confirmCardSetup(setupIntent.client_secret, {
        payment_method: { card: cardElement },
      });
      if (res) {
        const { error, setupIntent: setupIntentUpdated } = res;
        if (error) {
          alert(error.message);
        } else {
          setSetupIntents(setupIntentUpdated);
          await wallets.refetch();
          alert("success!!");
          cardElement.clear();
        }
      } else {
        alert("something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className={classes.pageTitle}>Customers</h2>

      <p className={classes.pageDescription}>
        Save credit card details for future use. Connect a Stripe Customer ID to
        a Firebase User ID.
      </p>

      <div className={classes.container}>
        <h3 className={classes.title}>Step 1: Create a Setup Intent</h3>

        <Button
          onClick={createSetupIntent}
          disabled={!!setupIntent || wallet.isPending}
          className="mt-3"
        >
          Attach New Credit Card
        </Button>
      </div>

      {setupIntent && (
        <form onSubmit={handleSubmit} className={classes.container}>
          <h3 className={classes.title}>Step 2: Submit a Payment Method</h3>
          <p className={classes.description}>
            Collect credit card details, then attach the payment source.
          </p>
          <div className={classes.gridContainer}>
            <p className={classes.gridLeftItem}>Normal Card:</p>{" "}
            <code>4242424242424242</code>
            <p className={classes.gridLeftItem}>3D Secure Card:</p>{" "}
            <code>4000002500003155</code>
          </div>

          <div className="flex items-center gap-4">
            <CardElement />
            <Button disabled={loading}>Attach</Button>
          </div>
        </form>
      )}

      <div className={classes.container}>
        <h3 className={classes.title}>Retrieve all Payment Sources</h3>
        <Select>
          <SelectTrigger className="mx-auto mt-4">
            <SelectValue placeholder="Cards" />
          </SelectTrigger>
          <SelectContent>
            {wallets.data?.map((paymentSource) => (
              <CreditCard key={paymentSource.id} card={paymentSource.card} />
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
};

const CreditCard = ({ card }: { card: PaymentMethod["card"] }) => {
  if (card) {
    const { last4, brand, exp_month, exp_year } = card;

    return (
      <SelectItem value={last4}>
        {brand} **** **** **** {last4} expires {exp_month}/{exp_year}
      </SelectItem>
    );
  }

  return null;
};

export default CustomersPage;
