"use client";
import { useStripe } from "@stripe/react-stripe-js";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

const product = {
  name: "Iphone 15 pro",
  description: "Apple iphone",
  images: [
    "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-15-pro-model-unselect-gallery-2-202309_GEO_US?wid=5120&hei=2880&fmt=webp&qlt=70&.v=UW1GeTRObi9UaVF4S3FUNERNMWVhZ2FRQXQ2R0JQTk5udUZxTkR3ZVlpS0o0bnJBQlJYRTdzdWVwMVBVb2c4L0lYUWYrQkRLNitCbE9QRVRqNHErMkE3b3pFWnhZZ2g0M0pRR0pEdHVSRUcyRlVVa0JFTnZqc0lHcUFYQnFjNXpkc3NlSXRDWlQ3WVl5dEd4ZUF1dDFRPT0=&traceId=1",
    "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-15-pro-model-unselect-gallery-1-202309?wid=5120&hei=2880&fmt=webp&qlt=70&.v=UW1GeTRObi9UaVF4S3FUNERNMWVhZ2FRQXQ2R0JQTk5udUZxTkR3ZVlpSmVJdk5rWHR5c3l5ME9ZNVV1Y1o0SjBoUVhuTWlrY2hIK090ZGZZbk9HeE1xUVVnSHY5eU9CcGxDMkFhalkvT0Q5QmVFZ0s0ZTVTcDJpVVJkaDNNVDdmbW94YnYxc1YvNXZ4emJGL0IxNFp3PT0=&traceId=1",
  ],
  amount: 100_000, // $1000
  currency: "usd",
} as const;

const CheckoutPage = () => {
  const router = useRouter();
  const stripe = useStripe();

  const [quantity, setQuantity] = useState(0);

  const searchParams = useSearchParams();
  const successParam = searchParams.get("success");
  const sessionIdParam = searchParams.get("session_id");

  const checkout = api.stripe.checkout.useMutation();

  const onCheckout = () => {
    checkout.mutate(
      {
        line_items: [
          {
            quantity,
            price_data: {
              unit_amount: product.amount,
              currency: "usd",
              product_data: {
                name: product.name,
                description: product.description,
                images: product.images,
              },
            },
          },
        ],
      },
      {
        onSuccess({ id: sessionId }) {
          void stripe?.redirectToCheckout({ sessionId });
        },
      },
    );
  };

  const [response, setResponse] = useState<{
    success: undefined | string;
    sessionId: undefined | string;
  }>({ success: undefined, sessionId: undefined });

  useEffect(() => {
    if (successParam && sessionIdParam) {
      setResponse({ success: successParam, sessionId: sessionIdParam });
      router.replace(
        window.location.href.split("?")[0] ?? window.location.href,
      );
    }
  }, [router, successParam, sessionIdParam]);

  return (
    <div className="mx-auto max-w-64 text-center">
      <ShowToast success={response.success} />
      <h2 className="text-4xl font-medium text-gray-900">Stripe Checkout</h2>
      <p className="pt-2 text-sm text-gray-500">
        Change the quantity of the products below, then click checkout to open
        the Stripe Checkout window.
      </p>

      <div className="pt-10">
        <div className="grid grid-cols-2">
          <h3 className="text-left font-medium">Product name:</h3>
          <p className="text-right">{product.name}</p>
        </div>
        <div className="grid grid-cols-2 pb-4">
          <h3 className="text-left font-medium">Stripe Amount:</h3>
          <p className="text-right">${product.amount / 100}</p>
        </div>

        <Image
          unoptimized
          src={product.images[0]}
          width={256}
          height={256}
          alt="product"
        />

        <div className="flex items-center py-4">
          <Button
            disabled={checkout.isPending}
            variant={"gooeyLeft"}
            onClick={() => setQuantity((pre) => Math.max(0, --pre))}
            size={"lg"}
            className="bg-secondary text-gray-900"
          >
            -
          </Button>
          <span className="grow text-3xl font-medium">{quantity}</span>
          <Button
            disabled={checkout.isPending}
            variant={"gooeyRight"}
            onClick={() => setQuantity((pre) => ++pre)}
            size={"lg"}
            className="bg-secondary text-gray-900"
          >
            +
          </Button>
        </div>
      </div>

      <Button onClick={onCheckout} disabled={checkout.isPending || !quantity}>
        Start Checkout
      </Button>
    </div>
  );
};

const ShowToast = ({ success }: { success?: string }) => {
  const showSuccess = useRef(true);
  useEffect(() => {
    if (!showSuccess.current) return;
    const paramSwitch: Record<string, () => unknown> = {
      true: () => toast.success("Checkout successful"),
      false: () => toast.error("Checkout not successful"),
    };
    if (success) {
      paramSwitch[success]?.();
      showSuccess.current = false;
    }
  }, [success]);

  return null;
};

export default CheckoutPage;
