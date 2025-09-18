import React from "react";
import { cn } from "../../lib/utils";

const buttonVariants = {
  default: "bg-gradient-to-r from-purple-300 to-purple-400 text-gray-700 hover:from-purple-400 hover:to-purple-500",
  outline: "border border-purple-200 bg-transparent hover:bg-purple-50",
  ghost: "hover:bg-purple-50 hover:text-purple-700",
  secondary: "bg-purple-100 text-purple-700 hover:bg-purple-200",
};

const buttonSizes = {
  sm: "h-9 px-3 text-sm",
  default: "h-10 px-4 py-2",
  lg: "h-11 px-8 text-lg",
};

export const Button = React.forwardRef(({ 
  className, 
  variant = "default", 
  size = "default", 
  children, 
  ...props 
}, ref) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";
