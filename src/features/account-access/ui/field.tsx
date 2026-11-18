import { useId } from 'react';

type Props = {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password';
  defaultValue?: string;
  errors?: string[];
  autoComplete?: string;
};

/** A labelled input whose errors are its accessible description. */
export function Field({ label, name, type = 'text', defaultValue, errors, autoComplete }: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-body text-text-muted">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={Boolean(errors?.length)}
        aria-describedby={errors?.length ? errorId : undefined}
        className="h-14 rounded border border-line bg-transparent px-3 text-body-lg text-text focus:border-brand"
      />
      {errors?.length ? (
        <p id={errorId} className="text-[13px] text-danger">
          {errors.join(' ')}
        </p>
      ) : null}
    </div>
  );
}
