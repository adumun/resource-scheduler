import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";

const baseField =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

export function Label({ children, htmlFor, required }: { children: ReactNode; htmlFor?: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
      {children}
      {required ? <span className="ml-0.5 text-red-500">*</span> : null}
    </label>
  );
}

export function FieldError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{children}</p>;
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${baseField} ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${baseField} ${className}`} {...rest} />;
}

export function Select({
  className = "",
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${baseField} ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 ${disabled ? "opacity-60" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900"
      />
      {label}
    </label>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  error,
  children,
  hint,
}: {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  error?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {error ? <FieldError>{error}</FieldError> : hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}
