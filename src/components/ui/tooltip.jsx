import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '../../lib/utils.js'

export const TooltipProvider = TooltipPrimitive.Provider
export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export function TooltipContent({ className, ...props }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={8}
        className={cn(
          'z-50 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-xl',
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
}


