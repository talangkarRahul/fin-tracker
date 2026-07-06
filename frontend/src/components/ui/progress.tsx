import { cn } from "../../lib/utils"

function Progress({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  return (
    <div className={cn("h-2 w-full rounded-full bg-muted overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500 ease-out", barClassName || "bg-primary")}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  )
}

export { Progress }
