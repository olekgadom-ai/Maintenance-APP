export default function Loading() {
  return (
    <div aria-busy className="space-y-3">
      <div className="h-8 w-2/3 animate-pulse rounded-lg bg-surface-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-surface-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-surface-muted" />
    </div>
  );
}
