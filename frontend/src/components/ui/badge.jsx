import React from "react";
import { cn } from "../../lib/utils";

const badgeVariants = {
  default: "bg-purple-600 hover:bg-purple-700 text-white",
  secondary: "bg-purple-100 text-purple-700 hover:bg-purple-200",
  outline: "border border-purple-200 text-purple-700 hover:bg-purple-50",
};

export const Badge = React.forwardRef(({ 
  className, 
  variant = "default", 
  ...props 
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
});

Badge.displayName = "Badge";
