import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Successful",
};

export default function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  return (
    <section className="mx-auto max-w-lg px-5 pb-24 pt-28 text-center md:px-8 md:pt-32">
      <h1 className="font-cinzel text-2xl text-gold">Payment received</h1>
      <p className="mt-4 text-muted">
        Thank you. Your payment is being processed. Return to the app to access your content.
      </p>
    </section>
  );
}
