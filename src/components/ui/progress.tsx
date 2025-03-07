import * as React from "react"

import { cn } from "../../utils/cn"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  indeterminate?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, indeterminate = false, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={indeterminate ? undefined : value}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-gray-700",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full bg-blue-500 transition-all",
            indeterminate && "animate-indeterminate-progress"
          )}
          style={{
            width: indeterminate ? "50%" : `${percentage}%`,
            transform: indeterminate ? undefined : `translateX(-${100 - percentage}%)`
          }}
        />
      </div>
    )
  }
)

Progress.displayName = "Progress"

export { Progress }
