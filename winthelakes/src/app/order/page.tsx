import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderReveal } from "@/components/OrderReveal";

export const metadata: Metadata = { title: "Your tickets", robots: { index: false } };

export default function OrderPage() {
  return (
    <div className="px-4 py-12 sm:px-6">
      <Suspense>
        <OrderReveal />
      </Suspense>
    </div>
  );
}
