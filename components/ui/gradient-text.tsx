import * as React from "react";
import { cn } from "@/lib/utils";

type GradientTextProps = {
  children: React.ReactNode;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
};

export function GradientText({ children, className, as: Tag = "span" }: GradientTextProps) {
  return (
    <Tag
      className={cn(
        "bg-gradient-to-r from-[#0052FF] to-[#4D7CFF] bg-clip-text text-transparent",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
