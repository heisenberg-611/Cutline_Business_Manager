"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: ScrollAreaPrimitive.Root.Props) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full overflow-y-auto overscroll-contain outline-none"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaScrollbar />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollAreaScrollbar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "m-0.5 flex touch-none p-px opacity-0 transition-opacity duration-150 select-none data-hovering:opacity-100 data-scrolling:opacity-100",
        orientation === "vertical" && "h-full w-1.5",
        orientation === "horizontal" && "h-1.5 w-full flex-col",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="flex-1 rounded-full bg-foreground/20 hover:bg-foreground/30"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollAreaScrollbar }
