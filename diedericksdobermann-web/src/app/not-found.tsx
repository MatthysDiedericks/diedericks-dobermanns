import { GoldLink } from "@/components/ui/GoldButton";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <p className="font-cinzel text-xs uppercase tracking-[0.3em] text-gold-dim">
        Lost the trail
      </p>
      <h1 className="mt-4 font-cinzel text-6xl font-black text-gold">404</h1>
      <p className="mt-4 max-w-md text-muted">
        The page you&apos;re looking for can&apos;t be found. It may have moved
        or never existed.
      </p>
      <div className="mt-8">
        <GoldLink href="/">Return Home</GoldLink>
      </div>
    </div>
  );
}
