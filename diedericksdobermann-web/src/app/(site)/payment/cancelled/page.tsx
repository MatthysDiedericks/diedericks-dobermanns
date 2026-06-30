import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Cancelled",
};

export default function PaymentCancelledPage() {
  return (
    <section className="mx-auto max-w-lg px-5 pb-24 pt-28 text-center md:px-8 md:pt-32">
      <h1 className="font-cinzel text-2xl text-gold">Payment cancelled</h1>
      <p className="mt-4 text-muted">
        No charge was made. You can try again from the app or contact us if you need help.
      </p>
      <a href="/contact" className="mt-6 inline-block text-gold underline">
        Contact us
      </a>
    </section>
  );
}
