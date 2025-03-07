import * as React from "react"
import { cn } from "../../utils/cn"
import { theme } from "../../styles/theme"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          `flex h-9 w-full rounded-md px-3 py-2 text-sm
          border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-gray-100
          placeholder:text-gray-500 dark:placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500
          focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900
          disabled:cursor-not-allowed disabled:opacity-50`,
            className
        )
        }
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
