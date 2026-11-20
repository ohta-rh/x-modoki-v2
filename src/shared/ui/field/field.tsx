import { useId } from 'react';

type Props = {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'url';
  defaultValue?: string;
  errors?: string[];
  autoComplete?: string;
  /** A several-line box (a profile's bio, #23). */
  multiline?: boolean;
};

const BOX =
  'rounded border border-line bg-transparent px-3 text-body-lg text-text focus:border-brand';

/** A labelled input whose errors are its accessible description. */
export function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  errors,
  autoComplete,
  multiline = false,
}: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  const shared = {
    id,
    name,
    defaultValue,
    'aria-invalid': Boolean(errors?.length),
    'aria-describedby': errors?.length ? errorId : undefined,
  };
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-body text-text-muted">
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} rows={3} className={`${BOX} resize-none py-2`} />
      ) : (
        <input {...shared} type={type} autoComplete={autoComplete} className={`h-14 ${BOX}`} />
      )}
      {errors?.length ? (
        <p id={errorId} className="text-[13px] text-danger">
          {errors.join(' ')}
        </p>
      ) : null}
    </div>
  );
}
