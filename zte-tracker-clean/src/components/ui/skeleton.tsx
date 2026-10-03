import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-md bg-surface-2", className)}
      {...props}
    >
      <span className="absolute inset-0 shimmer" />
    </div>
  );
}

export { Skeleton };
