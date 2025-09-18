import React from "react";
import { cn } from "../../lib/utils";

export const Select = ({ children, value, onValueChange, ...props }) => {
  return (
    <div className="relative" {...props}>
      {React.Children.map(children, child => 
        React.cloneElement(child, { value, onValueChange })
      )}
    </div>
  );
};

export const SelectTrigger = React.forwardRef(({ className, children, value, onValueChange, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <>
      <button
        ref={ref}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-purple-200 bg-white/80 px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onClick={() => setIsOpen(!isOpen)}
        {...props}
      >
        {children}
        <svg
          className="h-4 w-4 opacity-50"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </button>
    </>
  );
});
SelectTrigger.displayName = "SelectTrigger";

export const SelectValue = ({ placeholder, value }) => {
  return <span>{value || placeholder}</span>;
};

export const SelectContent = ({ children, value, onValueChange }) => {
  return (
    <div className="absolute top-full left-0 z-50 w-full mt-1 rounded-md border border-purple-200 bg-white shadow-lg">
      {React.Children.map(children, child => 
        React.cloneElement(child, { 
          onClick: () => onValueChange && onValueChange(child.props.value),
          isSelected: value === child.props.value
        })
      )}
    </div>
  );
};

export const SelectItem = ({ children, value, onClick, isSelected, ...props }) => {
  return (
    <div
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-purple-50 focus:bg-purple-50",
        isSelected && "bg-purple-100"
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};
