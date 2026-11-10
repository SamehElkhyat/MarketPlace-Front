/** Route-level loading UI: a calm skeleton in the shape of a typical page, not a spinner. */
export default function Loading() {
  return (
    <div className="page-container animate-pulse py-12" aria-busy aria-live="polite">
      <div className="mb-8 h-4 w-40 rounded-sm bg-muted" />
      <div className="mb-10 h-10 w-1/2 rounded-sm bg-muted" />
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-3">
            <div className="media-4x5" />
            <div className="h-4 w-3/4 rounded-sm bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
