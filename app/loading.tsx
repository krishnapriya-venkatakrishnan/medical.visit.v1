import { BoardSkeleton } from "@/components/member-board/board-skeleton";

export default function Loading() {
  return (
    <main className="flex-1 bg-linear-to-b from-white to-icy">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
        <div className="mb-10 space-y-3">
          <div className="h-3 w-16 rounded bg-surface-sunken" />
          <div className="h-8 w-72 rounded bg-surface-sunken" />
        </div>
        <BoardSkeleton />
      </div>
    </main>
  );
}
