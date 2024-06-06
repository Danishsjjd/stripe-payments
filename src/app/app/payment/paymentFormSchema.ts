import { z } from "zod";

export const paymentForm = z.object({
  amount: z.coerce.number().min(50).max(9999999),
});
