import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <h1 className="display text-7xl sm:text-8xl">Lost in the fells</h1>
      <p className="mt-4 text-lg">That page doesn&rsquo;t exist, or the competition has closed.</p>
      <Link href="/competitions" className="btn btn-primary mt-8">
        Live competitions
      </Link>
    </div>
  );
}
