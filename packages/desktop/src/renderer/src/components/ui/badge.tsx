import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export const Badge: React.FC<BadgeProps> = ({
  className = "",
  children,
  variant = "default",
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

  const variantClasses = {
    default: "bg-blue-100 text-blue-800",
    secondary: "bg-gray-100 text-gray-800",
    destructive: "bg-red-100 text-red-800",
    outline: "border border-gray-200 bg-white text-gray-700",
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
};
