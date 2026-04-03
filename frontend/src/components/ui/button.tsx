import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Custom variants matching current app
        mint: "bg-[#B5EAD7] text-[#4A4A4A] shadow-md hover:bg-[#a3e6ce] hover:-translate-y-0.5",
        peach: "bg-[#FFDAC1] text-[#4A4A4A] shadow-md hover:brightness-95 hover:-translate-y-0.5",
        active: "bg-[#FF9AA2] text-white shadow-md hover:-translate-y-0.5",
        lavender: "bg-[#C7CEEA] text-[#4A4A4A] shadow-md hover:-translate-y-0.5",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        xl: "h-14 px-8 text-xl rounded-full", // For main play button
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Default spinner component
const DefaultSpinner = ({ className }: { className?: string }) => (
  <Loader2 className={cn("animate-spin", className)} />
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Shows a loading spinner and disables the button (HeroUI pattern) */
  isLoading?: boolean
  /** Custom spinner component */
  spinner?: React.ReactNode
  /** Spinner placement: start or end (default: start) */
  spinnerPlacement?: "start" | "end"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    isLoading = false,
    spinner,
    spinnerPlacement = "start",
    disabled,
    children,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Determine spinner size based on button size
    const spinnerSize = size === "sm" ? "h-3 w-3" : size === "lg" || size === "xl" ? "h-5 w-5" : "h-4 w-4"
    
    // Custom or default spinner
    const spinnerElement = spinner || <DefaultSpinner className={spinnerSize} />
    
    // When loading, show spinner alongside or instead of content
    const content = isLoading ? (
      <>
        {spinnerPlacement === "start" && <span className="mr-2">{spinnerElement}</span>}
        <span className={isLoading ? "opacity-70" : ""}>{children}</span>
        {spinnerPlacement === "end" && <span className="ml-2">{spinnerElement}</span>}
      </>
    ) : (
      children
    )
    
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          isLoading && "cursor-wait"
        )}
        ref={ref}
        disabled={disabled || isLoading}
        data-loading={isLoading || undefined}
        {...props}
      >
        {content}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
