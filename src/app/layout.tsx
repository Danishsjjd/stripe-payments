import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";

import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "~/components/ui/sonner";

export const metadata = {
  title: "Stripe payments",
  description: "Generated for stipe payments",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
