import type { Metadata } from "next";
import { AccountView } from "@/components/AccountView";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="display mb-8 text-5xl">My account</h1>
      <AccountView />
    </div>
  );
}
