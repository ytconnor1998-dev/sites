import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="display text-8xl text-lake">404</p>
      <h1 className="display mt-4 text-4xl">Lost in the fells</h1>
      <p className="mt-3 text-fog">That page doesn&rsquo;t exist, or the competition has closed.</p>
      <Link href="/competitions" className="btn btn-primary mt-8">
        Live competitions
      </Link>
    </div>
  );
}
