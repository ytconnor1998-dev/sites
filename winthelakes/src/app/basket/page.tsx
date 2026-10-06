import type { Metadata } from "next";
import { Basket } from "@/components/Basket";

export const metadata: Metadata = { title: "Basket", robots: { index: false } };

export default function BasketPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="display mb-8 text-5xl">Your basket</h1>
      <Basket />
    </div>
  );
}
