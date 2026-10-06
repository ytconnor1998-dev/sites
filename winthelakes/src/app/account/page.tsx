import type { Metadata } from "next";
import { AccountView } from "@/components/AccountView";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="display text-6xl sm:text-7xl">My account</h1>
      <div className="mt-4">
        <AccountView />
      </div>
    </div>
  );
}
