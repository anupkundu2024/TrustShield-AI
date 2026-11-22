import { useId, type ComponentProps } from 'react';

type InputProps = ComponentProps<'input'> & {
  label: string;
  hint?: string;
  error?: string;
};

export function Input({
  label,
  hint,
  error,
  id,
  className = '',
  'aria-describedby': describedBy,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const detail = error ?? hint;
  const description = [describedBy, detail && `${inputId}-detail`]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="grid gap-2">
      <label className="font-semibold" htmlFor={inputId}>
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={description || undefined}
        className={`w-full min-h-11 rounded-xl border bg-white px-3 ${error ? 'border-danger' : 'border-line'} ${className}`}
      />
      {detail && (
        <p
          id={`${inputId}-detail`}
          className={error ? 'text-sm text-danger' : 'text-sm text-muted'}
        >
          {detail}
        </p>
      )}
    </div>
  );
}
