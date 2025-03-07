import * as React from "react"
import { cn } from "../../utils/cn"
import { theme } from "../../styles/theme"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm text-gray-900 dark:text-gray-100", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b border-gray-200 dark:border-gray-700", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0 text-gray-700 dark:text-gray-300", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      `border-b transition-colors border-gray-200 dark:border-gray-700
      hover:bg-gray-50 dark:hover:bg-gray-800/50
      data-[state=selected]:bg-gray-50 dark:data-[state=selected]:bg-gray-800/50`,
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-700 dark:text-gray-300", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      `h-12 px-4 text-left align-middle font-medium
      text-gray-700 dark:text-gray-200
      [&:has([role=checkbox])]:pr-0`,
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

export { Table, TableHeader, TableBody, TableRow, TableCell, TableHead }
