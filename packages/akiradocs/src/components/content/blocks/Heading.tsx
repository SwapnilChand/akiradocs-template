import React from 'react';
import { cn } from "@/lib/utils";

interface HeadingProps {
  id?: string;
  level: number;
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  styles?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  };
}

export function Heading({ id, level, children, align = 'left', styles }: HeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const sizeClasses = {
    1: 'text-4xl',
    2: 'text-3xl',
    3: 'text-2xl',
    4: 'text-xl',
    5: 'text-lg',
    6: 'text-base',
  };
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : '';

  return (
    <Tag id={id} className={cn(
      `font-bold mb-2 py-4 ${sizeClasses[level as keyof typeof sizeClasses]} ${alignClass}`,
      styles?.italic && 'italic',
      styles?.underline && 'underline'
    )}>
      {children}
    </Tag>
  );
}

interface MainTitleProps {
  id?: string;
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  styles?: { bold?: boolean; italic?: boolean; underline?: boolean; };
}

export function MainTitle({ id, children, align = 'left', styles }: MainTitleProps) {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : '';
  return (
    <h1 id={id} className={cn(
      `text-4xl font-bold text-foreground mb-1 py-1 ${alignClass}`,
      styles?.italic && 'italic',
      styles?.underline && 'underline'
    )}>
      {children}
    </h1>
  );
}