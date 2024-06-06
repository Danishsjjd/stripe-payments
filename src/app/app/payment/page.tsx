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

type PaymentIntent = Stripe.Response<Stripe.PaymentIntent>;
const PaymentPage = () => {
  const stripe = useStripe();
  const elements = useElements();

  const paymentIntent = api.stripe.payments.useMutation();

  const [paymentIntentResponse, setPaymentIntentResponse] = useState<
    PaymentIntent | undefined
  >();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof paymentForm>>({
    resolver: zodResolver(paymentForm),
    defaultValues: {
      amount: 50,
    },
  });

  const onPiSecret = async (data: z.infer<typeof paymentForm>) => {
    if (!!paymentIntentResponse || paymentIntent.isPending) return;

    paymentIntent.mutate(data, {
      onSuccess(data) {
        setPaymentIntentResponse(data);
      },
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const cardElement = elements?.getElement(CardElement);
    if (!paymentIntentResponse || !cardElement) return;

    setLoading(true);
    const cardPayment = await stripe?.confirmCardPayment(
      paymentIntentResponse.client_secret!,
      {
        payment_method: {
          card: cardElement,
        },
      },
    );
    setLoading(false);
    if (!cardPayment || cardPayment.error) {
      console.error("error:", cardPayment?.error);

      cardPayment?.error.payment_intent &&
        setPaymentIntentResponse(
          cardPayment.error.payment_intent as PaymentIntent,
        );
    } else {
      console.info("success:", cardPayment.paymentIntent);
      setPaymentIntentResponse(cardPayment.paymentIntent as PaymentIntent);
    }
  };

  const amount = form.getValues("amount");
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
            onSubmit={form.handleSubmit(onPiSecret)}
            className="flex items-center gap-4"
          >
            <FormInput
              form={form}
              name="amount"
              input={{
                placeholder: "Amount",
                type: "number",
                disabled: !!paymentIntentResponse,
                className: "grow",
              }}
            />
            <Button
              disabled={
                amount <= 0 ||
                paymentIntent.isPending ||
                !!paymentIntentResponse
              }
            >
              Ready to Pay ${(amount / 100).toFixed(2)}
            </Button>
          </form>
        </Form>
      </div>

      {paymentIntentResponse && (
        <form onSubmit={handleSubmit} className={classes.container}>
          <h3 className={classes.title}>Step 2: Submit a Payment Method</h3>
          <p className={classes.description}>
            Collect credit card details, then submit the payment.
          </p>
          <div className={classes.gridContainer}>
            <p className={classes.gridLeftItem}>Normal Card:</p>{" "}
            <code>4242424242424242</code>
            <p className={classes.gridLeftItem}>3D Secure Card:</p>{" "}
            <code>4000002500003155</code>
          </div>

          <CardElement />
          <Button
            className="mt-4"
            disabled={loading || paymentIntent.status === "success"}
          >
            Pay
          </Button>
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
