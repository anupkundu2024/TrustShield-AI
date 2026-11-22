import { LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <LoaderCircle
        aria-hidden="true"
        className="size-5 motion-safe:animate-spin"
      />
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-5 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-navy">{title}</h1>
      <p className="max-w-md leading-relaxed text-muted">{description}</p>
      {action}
    </div>
  );
}

const alertColors = {
  info: 'border-blue-200 bg-blue-50 text-blue-950',
  success: 'border-green-200 bg-green-50 text-green-950',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  danger: 'border-red-200 bg-red-50 text-red-950',
};

export function Alert({
  variant = 'info',
  children,
}: {
  variant?: keyof typeof alertColors;
  children: ReactNode;
}) {
  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      className={`rounded-xl border p-4 ${alertColors[variant]}`}
    >
      {children}
    </div>
  );
}
