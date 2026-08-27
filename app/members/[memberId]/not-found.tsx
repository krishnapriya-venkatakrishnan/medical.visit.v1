import Link from "next/link";

export default function MemberNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start px-6 py-20">
      <h1 className="text-2xl font-semibold text-ink">No such member</h1>
      <p className="mt-2 text-sm text-muted">
        That member is not on today&rsquo;s board. It may have been a stale link.
      </p>
      <Link href="/" className="mt-6 text-sm text-accent hover:underline">
        Back to board
      </Link>
    </main>
  );
}
