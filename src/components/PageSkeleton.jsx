export default function PageSkeleton() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg-base p-4">
      <div className="flex flex-col items-center space-y-4">
        {/* Chess piece loading icon */}
        <div className="text-5xl animate-bounce">♟</div>
        <div className="h-4 w-32 animate-pulse rounded bg-bg-surface" />
        <div className="h-3 w-48 animate-pulse rounded bg-bg-elevated/50" />
      </div>
    </div>
  );
}
