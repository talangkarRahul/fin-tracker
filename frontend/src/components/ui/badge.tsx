import { cn } from "../../lib/utils"

const variants = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary-light text-primary-hover",
  success: "bg-success-light text-success",
  warning: "bg-warning-light text-warning",
  danger: "bg-destructive-light text-destructive",
  secondary: "bg-muted text-muted-foreground",
} as const

function Badge({ className, variant = "default", children }: { className?: string; variant?: keyof typeof variants; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-border/50", variants[variant], className)}>
      {children}
    </span>
  )
}

export { Badge }
