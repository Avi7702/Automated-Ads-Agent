"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

// Cast Radix primitives to work around React 19 type incompatibility
// These components work correctly at runtime; the type issues are purely a TS/React 19 mismatch
const TabsRootPrimitive = TabsPrimitive.Root as React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    orientation?: "horizontal" | "vertical"
    dir?: "ltr" | "rtl"
    activationMode?: "automatic" | "manual"
  } & React.RefAttributes<HTMLDivElement>
>
const TabsListPrimitive = TabsPrimitive.List as React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> & {
    loop?: boolean
  } & React.RefAttributes<HTMLDivElement>
>
const TabsTriggerPrimitive = TabsPrimitive.Trigger as React.ForwardRefExoticComponent<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string
  } & React.RefAttributes<HTMLButtonElement>
>
const TabsContentPrimitive = TabsPrimitive.Content as React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> & {
    value: string
    forceMount?: true
  } & React.RefAttributes<HTMLDivElement>
>

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  orientation?: "horizontal" | "vertical"
  dir?: "ltr" | "rtl"
  activationMode?: "automatic" | "manual"
  children?: React.ReactNode
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, ...props }, ref) => (
    <TabsRootPrimitive
      ref={ref}
      className={cn(className)}
      {...props}
    />
  )
)
Tabs.displayName = "Tabs"

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  loop?: boolean
  children?: React.ReactNode
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => (
    <TabsListPrimitive
      ref={ref}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
)
TabsList.displayName = "TabsList"

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  children?: React.ReactNode
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, ...props }, ref) => (
    <TabsTriggerPrimitive
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
        className
      )}
      {...props}
    />
  )
)
TabsTrigger.displayName = "TabsTrigger"

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  forceMount?: true
  children?: React.ReactNode
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, ...props }, ref) => (
    <TabsContentPrimitive
      ref={ref}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  )
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
