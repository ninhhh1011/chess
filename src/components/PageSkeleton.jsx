export default function PageSkeleton() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 p-4">
      <div className="flex flex-col items-center space-y-4">
        {/* Pulse animation for a skeleton board/spinner */}
        <div className="h-16 w-16 animate-pulse rounded-xl bg-slate-800" />
        <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
        <div className="h-3 w-48 animate-pulse rounded bg-slate-800/50" />
      </div>
    </div>
  );
}
