import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  suffix?: ReactNode;
};

export function Field({ label, error, hint, suffix, className = '', id, ...props }: FieldProps) {
  const inputId = id ?? props.name;
  const describedBy = [error ? `${inputId}-error` : null, hint ? `${inputId}-hint` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={`field ${error ? 'fieldError' : ''} ${className}`}>
      <span>{label}</span>
      <div className="fieldControl">
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          {...props}
        />
        {suffix}
      </div>
      {error ? (
        <small id={`${inputId}-error`} className="fieldErrorText">
          {error}
        </small>
      ) : null}
      {hint ? (
        <small id={`${inputId}-hint`} className="fieldHint">
          {hint}
        </small>
      ) : null}
    </label>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function SelectField({ label, error, hint, children, className = '', id, ...props }: SelectFieldProps) {
  const inputId = id ?? props.name;
  const describedBy = [error ? `${inputId}-error` : null, hint ? `${inputId}-hint` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={`field ${error ? 'fieldError' : ''} ${className}`}>
      <span>{label}</span>
      <select id={inputId} aria-invalid={Boolean(error)} aria-describedby={describedBy || undefined} {...props}>
        {children}
      </select>
      {error ? (
        <small id={`${inputId}-error`} className="fieldErrorText">
          {error}
        </small>
      ) : null}
      {hint ? (
        <small id={`${inputId}-hint`} className="fieldHint">
          {hint}
        </small>
      ) : null}
    </label>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextAreaField({ label, error, hint, className = '', id, ...props }: TextAreaFieldProps) {
  const inputId = id ?? props.name;
  const describedBy = [error ? `${inputId}-error` : null, hint ? `${inputId}-hint` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={`field ${error ? 'fieldError' : ''} ${className}`}>
      <span>{label}</span>
      <textarea id={inputId} aria-invalid={Boolean(error)} aria-describedby={describedBy || undefined} {...props} />
      {error ? (
        <small id={`${inputId}-error`} className="fieldErrorText">
          {error}
        </small>
      ) : null}
      {hint ? (
        <small id={`${inputId}-hint`} className="fieldHint">
          {hint}
        </small>
      ) : null}
    </label>
  );
}
