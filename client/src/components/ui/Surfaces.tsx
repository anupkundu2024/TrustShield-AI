import type { ComponentProps } from 'react';

export function Container({ className = '', ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={`mx-auto w-full max-w-[76rem] px-5 sm:px-8 lg:px-10 ${className}`}
    />
  );
}

export function Card({ className = '', ...props }: ComponentProps<'article'>) {
  return (
    <article
      {...props}
      className={`rounded-3xl border border-line bg-white ${className}`}
    />
  );
}

const badgeColors = {
  teal: 'bg-teal-50 text-teal-800',
  neutral: 'bg-slate-100 text-slate-700',
};

export function Badge({
  variant = 'teal',
  className = '',
  ...props
}: ComponentProps<'span'> & { variant?: keyof typeof badgeColors }) {
  return (
    <span
      {...props}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${badgeColors[variant]} ${className}`}
    />
  );
}

export function SectionHeading({
  id,
  title,
  description,
}: {
  id?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2 id={id} className="section-heading text-navy">
        {title}
      </h2>
      {description && (
        <p className="mt-3 max-w-xl leading-relaxed text-muted">
          {description}
        </p>
      )}
    </div>
  );
}
