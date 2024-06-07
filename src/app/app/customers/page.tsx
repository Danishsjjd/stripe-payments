"use client";

import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { PaymentMethod, SetupIntent } from "@stripe/stripe-js";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import StripeCards from "~/components/StripeCards";
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

  const onAttachCardSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cardElement = element?.getElement(CardElement);

    if (!setupIntent?.client_secret || !cardElement) return;

    setLoading(true);
    try {
      const res = await stripe?.confirmCardSetup(setupIntent.client_secret, {
        payment_method: { card: cardElement },
      });
      if (res) {
        const { error, setupIntent: setupIntentUpdated } = res;
        if (error) {
          toast.error(error.message);
        } else {
          setSetupIntents(setupIntentUpdated);
          await wallets.refetch();
          toast.success("success!!");
          cardElement.clear();
        }
      } else {
        toast.info("something went wrong");
      }
    } finally {
      setLoading(false);
      setSetupIntents(null);
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
        <form onSubmit={onAttachCardSubmit} className={classes.container}>
          <h3 className={classes.title}>Step 2: Submit a Payment Method</h3>
          <p className={classes.description}>
            Collect credit card details, then attach the payment source.
          </p>

          <StripeCards />
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
