import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-slate-900 text-slate-50 shadow',
        secondary: 'border-transparent bg-slate-100 text-slate-900',
        destructive: 'border-transparent bg-red-100 text-red-800 border-red-200',
        outline: 'text-slate-950 border-slate-300',
        success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        warning: 'bg-amber-100 text-amber-800 border-amber-200',
        critical: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse',
        info: 'bg-blue-100 text-blue-800 border-blue-200',
        purple: 'bg-purple-100 text-purple-800 border-purple-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
