import { cn } from "~/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("block animate-pulse rounded-md bg-night-800", className)}
      {...props}
    />
  );
}

export { Skeleton };
