import { Eye, EyeOff } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { Input } from '../ui/Input';

export function PasswordField({
  label,
  ...props
}: ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        label={label}
        type={visible ? 'text' : 'password'}
        className="pr-13"
      />
      <button
        type="button"
        aria-label={
          visible
            ? 'Hide ' + label.toLowerCase()
            : 'Show ' + label.toLowerCase()
        }
        className="absolute top-8 right-1 inline-flex size-11 items-center justify-center rounded-lg text-muted hover:text-navy"
        onClick={() => setVisible(!visible)}
      >
        {visible ? (
          <EyeOff size={19} aria-hidden="true" />
        ) : (
          <Eye size={19} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
