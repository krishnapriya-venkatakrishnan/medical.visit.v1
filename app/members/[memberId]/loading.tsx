export default function Loading() {
  return (
    <main className="flex-1 bg-linear-to-b from-white to-icy">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="h-4 w-24 rounded bg-surface-sunken" />
        <div className="mt-6 h-8 w-56 rounded bg-surface-sunken" />
        <div className="mt-3 h-4 w-72 rounded bg-surface-sunken" />
        <div className="mt-10 grid gap-x-8 gap-y-12 md:grid-cols-2">
          <div className="h-48 rounded-card bg-surface-sunken" />
          <div className="h-72 rounded-card bg-surface-sunken" />
          <div className="h-40 rounded-card bg-surface-sunken" />
          <div className="h-40 rounded-card bg-surface-sunken" />
        </div>
      </div>
    </main>
  );
}
