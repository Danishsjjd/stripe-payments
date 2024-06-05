import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const authRouter = createTRPCRouter({
  user: protectedProcedure.query(({ ctx }) => {
    return ctx.user;
  }),
});
