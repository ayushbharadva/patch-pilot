import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        // Neural-dark redesign (260703-vga): a shimmering glass placeholder
        // instead of a flat pulsing block. .animate-shimmer degrades to static
        // under prefers-reduced-motion.
        "animate-shimmer rounded-md border border-foreground/5 bg-foreground/5",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
