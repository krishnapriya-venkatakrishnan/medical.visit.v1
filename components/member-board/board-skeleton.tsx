/**
 * Loading state for the Member Board table. Mirrors the row layout so the page
 * does not jump when data arrives.
 */
export function BoardSkeleton() {
  return (
    <div
      className="overflow-x-auto rounded-card border border-hairline bg-surface shadow-md"
      aria-hidden
    >
      <table className="w-full min-w-184 border-collapse text-sm">
        <tbody>
          {Array.from({ length: 3 }).map((_, i) => (
            <tr key={i} className="border-b border-hairline last:border-0">
              <td className="px-5 py-4">
                <span className="block h-5 w-28 rounded bg-surface-sunken" />
              </td>
              <td className="px-5 py-4">
                <span className="block h-4 w-20 rounded bg-surface-sunken" />
              </td>
              <td className="px-5 py-4">
                <span className="block h-4 w-24 rounded bg-surface-sunken" />
              </td>
              <td className="px-5 py-4">
                <span className="block h-5 w-10 rounded bg-surface-sunken" />
              </td>
              <td className="px-5 py-4">
                <span className="block h-4 w-64 max-w-full rounded bg-surface-sunken" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
