"use client"

import * as React from "react"
import { Menu } from "@base-ui/react/menu"
import { cn } from "@/lib/utils"

function DropdownMenu({ ...props }: Menu.Root.Props) {
  return <Menu.Root {...props} />
}

function DropdownMenuTrigger({ ...props }: Menu.Trigger.Props) {
  return <Menu.Trigger {...props} />
}

function DropdownMenuPortal({ ...props }: Menu.Portal.Props) {
  return <Menu.Portal {...props} />
}

function DropdownMenuPositioner({
  className,
  ...props
}: Menu.Positioner.Props) {
  return (
    <Menu.Positioner
      className={cn("z-50", className)}
      {...props}
    />
  )
}

function DropdownMenuPopup({
  className,
  ...props
}: Menu.Popup.Props) {
  return (
    <Menu.Popup
      className={cn(
        "min-w-[8rem] overflow-hidden rounded-lg border border-[#E8EAEC] bg-white p-1 shadow-lg",
        "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
        "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  ...props
}: Menu.Item.Props) {
  return (
    <Menu.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium text-[#606265] outline-none transition-colors",
        "hover:bg-[#F2F2F2] hover:text-[#383B3E]",
        "focus-visible:bg-[#F2F2F2] focus-visible:text-[#383B3E]",
        "data-highlighted:bg-[#F2F2F2] data-highlighted:text-[#383B3E]",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("-mx-1 my-1 h-px bg-[#E8EAEC]", className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuPositioner,
  DropdownMenuPopup,
  DropdownMenuItem,
  DropdownMenuSeparator,
}
