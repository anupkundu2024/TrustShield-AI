import type { ComponentProps } from 'react';
import { Link } from 'react-router';

type Variant = 'primary' | 'secondary';
type ButtonProps = ComponentProps<'button'> & { variant?: Variant };
type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant };

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`button button-${variant} ${className}`}
    />
  );
}

export function LinkButton({
  variant = 'primary',
  className = '',
  ...props
}: LinkButtonProps) {
  return (
    <Link {...props} className={`button button-${variant} ${className}`} />
  );
}
