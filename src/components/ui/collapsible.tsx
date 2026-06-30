import * as React from "react";
import { cn } from "@/lib/utils";

interface CollapsibleContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

export function Collapsible({
  open,
  onOpenChange,
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <CollapsibleContext.Provider value={{ open, setOpen: onOpenChange }}>
      <div className={className}>{children}</div>
    </CollapsibleContext.Provider>
  );
}

export function CollapsibleTrigger({
  className,
  disabled,
  children,
}: {
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(CollapsibleContext);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => ctx?.setOpen(!ctx.open)}
      className={cn("w-full", className)}
    >
      {children}
    </button>
  );
}

export function CollapsibleContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx?.open) return null;
  return <div className={className}>{children}</div>;
}
