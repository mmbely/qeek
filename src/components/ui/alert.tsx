import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react"

import { cn } from "../../utils/cn"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        success: "border-green-700 bg-green-900/20 text-green-400 dark:border-green-800 [&>svg]:text-green-400",
        error: "border-red-700 bg-red-900/20 text-red-400 dark:border-red-800 [&>svg]:text-red-400",
        warning: "border-yellow-700 bg-yellow-900/20 text-yellow-400 dark:border-yellow-800 [&>svg]:text-yellow-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => {
  const icon = React.useMemo(() => {
    switch (variant) {
      case "success":
        return <CheckCircle2 className="h-4 w-4" />
      case "error":
        return <XCircle className="h-4 w-4" />
      case "warning":
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }, [variant])

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {icon}
      <div className="flex-1">{props.children}</div>
    </div>
  )
})
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
