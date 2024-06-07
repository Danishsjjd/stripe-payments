"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import type Stripe from "stripe";
import { type z } from "zod";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Form, FormInput } from "~/components/ui/form";
import { classes } from "~/data/classes";
import { api } from "~/trpc/react";
import { paymentForm } from "./paymentFormSchema";
import StripeCards from "~/components/StripeCards";
import { toast } from "sonner";

type PaymentIntent = Stripe.Response<Stripe.PaymentIntent>;
const PaymentPage = () => {
  const stripe = useStripe();
  const elements = useElements();

  const paymentIntent = api.stripe.payments.useMutation();

  const [paymentIntentResponse, setPaymentIntentResponse] = useState<
    PaymentIntent | undefined
  >();

  const form = useForm<z.infer<typeof paymentForm>>({
    resolver: zodResolver(paymentForm),
    defaultValues: {
      amount: 50,
    },
  });

  const onPaymentIntentSecret = async (data: z.infer<typeof paymentForm>) => {
    if (!!paymentIntentResponse || paymentIntent.isPending) return;

    paymentIntent.mutate(data, {
      onSuccess(data) {
        setPaymentIntentResponse(data);
      },
    });
  };

  const [loading, setLoading] = useState(false);
  const onPaySubmit = async (e: FormEvent) => {
    e.preventDefault();

    const cardElement = elements?.getElement(CardElement);
    if (!paymentIntentResponse || !cardElement) return;

    setLoading(true);
    try {
      const cardPayment = await stripe?.confirmCardPayment(
        paymentIntentResponse.client_secret!,
        {
          payment_method: {
            card: cardElement,
          },
        },
      );
      if (!cardPayment || cardPayment.error) {
        console.error("error:", cardPayment?.error);
        if (cardPayment?.error.message) {
          toast.error(cardPayment?.error.message);
        }

        cardPayment?.error.payment_intent &&
          setPaymentIntentResponse(
            cardPayment.error.payment_intent as PaymentIntent,
          );
      } else {
        toast.success("Payment successful");
        console.info("success:", cardPayment.paymentIntent);
        setPaymentIntentResponse(cardPayment.paymentIntent as PaymentIntent);
      }
    } finally {
      setLoading(false);
    }
  };

  const amount = form.watch("amount");
  return (
    <>
      <h2 className={classes.pageTitle}>Payments</h2>
      <p className={classes.pageDescription}>One-time payment scenario.</p>
      <div className={classes.container}>
        <PaymentIntentData data={paymentIntentResponse} />
      </div>

      <div className={classes.container}>
        <h3 className={classes.title}>Step 1: Create a Payment Intent</h3>
        <p className={classes.description}>
          Change the amount of the payment in the form, then request a Payment
          Intent to create context for one-time payment. Min 50, Max 9999999
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onPaymentIntentSecret)}
            className="flex items-center gap-4"
          >
            <FormInput
              form={form}
              name="amount"
              input={{
                placeholder: "Amount",
                type: "number",
                disabled: paymentIntent.isPending || !!paymentIntentResponse,
                className: "grow",
              }}
            />
            <Button
              disabled={paymentIntent.isPending || !!paymentIntentResponse}
            >
              Ready to Pay ${(amount / 100).toFixed(2)}
            </Button>
          </form>
        </Form>
      </div>

      {paymentIntentResponse && (
        <form onSubmit={onPaySubmit} className={classes.container}>
          <h3 className={classes.title}>Step 2: Submit a Payment Method</h3>
          <p className={classes.description}>
            Collect credit card details, then submit the payment.
          </p>
          <StripeCards />

          <div className="flex items-center gap-4">
            <CardElement />
            <Button
              disabled={loading || paymentIntentResponse.status === "succeeded"}
            >
              Pay
            </Button>
          </div>
        </form>
      )}
    </>
  );
};

function PaymentIntentData(props: {
  data?: Stripe.Response<Stripe.PaymentIntent>;
}) {
  if (props.data) {
    const { id, amount, status, client_secret } = props.data;
    return (
      <>
        <h3>
          Payment Intent{" "}
          <Badge variant={status === "succeeded" ? "default" : "secondary"}>
            {status}
          </Badge>
        </h3>

        <div className={classes.gridContainer}>
          <p className={classes.gridLeftItem}>ID: </p> <pre>{id}</pre>
          <p className={classes.gridLeftItem}>Client Secret: </p>
          <pre>{client_secret}</pre>
          <p className={classes.gridLeftItem}>Amount: </p>
          <pre>{amount}</pre>
          <p className={classes.gridLeftItem}>Status: </p>
          <pre>{status}</pre>
        </div>
      </>
    );
  }

  return <p>Payment Intent Not Created Yet</p>;
}

export default PaymentPage;
