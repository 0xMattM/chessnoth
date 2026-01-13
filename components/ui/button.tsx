import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden',
  {
    variants: {
      variant: {
        // Chessnoth Branding: Primary button with blue glow and metallic effect
        default: 'primary-button text-white font-semibold uppercase tracking-wider active:scale-95',
        // Destructive with red glow
        destructive: 'bg-red-600 text-white border-2 border-red-600 hover:bg-red-700 hover:border-red-500 active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.35),inset_0_0_8px_rgba(220,38,38,0.15),0_4px_8px_rgba(0,0,0,0.4)] hover:shadow-[0_0_20px_rgba(220,38,38,0.5),inset_0_0_12px_rgba(220,38,38,0.25),0_4px_8px_rgba(0,0,0,0.4)]',
        // Premium button with gold metallic frame
        outline: 'premium-button font-semibold uppercase tracking-wider active:scale-95',
        // Secondary with subtle metallic effect
        secondary: 'bg-slate-800/80 text-foreground border-2 border-slate-600/50 hover:bg-slate-700/80 hover:border-slate-500/70 active:scale-95 shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.04)]',
        ghost: 'hover:bg-slate-800/50 hover:text-accent-foreground active:scale-95',
        link: 'text-blue-400 underline-offset-4 hover:text-blue-300 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }

