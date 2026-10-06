"use client";

import { forwardRef, useCallback, useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-md border border-line-strong bg-surface px-3.5 text-body text-fg placeholder:text-fg-subtle transition-[border-color,box-shadow] outline-none focus:border-fg-muted focus:ring-4 focus:ring-[color-mix(in_srgb,var(--focus)_18%,transparent)] aria-[invalid=true]:border-danger disabled:bg-surface-muted";

type FieldWrapProps = { label?: ReactNode; hint?: ReactNode; error?: string; id: string; children: ReactNode; counter?: ReactNode; className?: string };

export function FieldWrap({ label, hint, error, id, children, counter, className }: FieldWrapProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-caption font-semibold text-fg">
          {label}
        </label>
      )}
      {children}
      {(error || hint || counter) && (
        <div className="flex items-start justify-between gap-3 text-label">
          {error ? (
            <p id={`${id}-error`} role="alert" className="text-danger">
              {error}
            </p>
          ) : (
            <p id={`${id}-hint`} className="text-fg-subtle">
              {hint}
            </p>
          )}
          {counter}
        </div>
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; hint?: ReactNode; error?: string; prefix?: ReactNode; wrapClassName?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, prefix, className, wrapClassName, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldWrap label={label} hint={hint} error={error} id={inputId} className={wrapClassName}>
      <div className="relative flex items-center">
        {prefix && <span className="pointer-events-none absolute left-3.5 text-fg-subtle">{prefix}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(control, "h-11", prefix ? "pl-8" : undefined, className)}
          {...rest}
        />
      </div>
    </FieldWrap>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  showCount?: boolean;
  minRows?: number;
  wrapClassName?: string;
};

/** 내용에 맞춰 높이가 늘어나는 textarea (+글자 수) */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, showCount, maxLength, minRows = 3, className, wrapClassName, id, onChange, value, defaultValue, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const inner = useRef<HTMLTextAreaElement | null>(null);
  const [uncontrolledLength, setLength] = useState(String(defaultValue ?? "").length);
  const length = value !== undefined ? String(value).length : uncontrolledLength;

  const resize = useCallback(() => {
    const el = inner.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight + 2, 640)}px`;
  }, []);
  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <FieldWrap
      label={label}
      hint={hint}
      error={error}
      id={inputId}
      className={wrapClassName}
      counter={
        showCount && maxLength ? (
          <span className={cn("tabular-nums", length > maxLength * 0.9 ? "text-warning" : "text-fg-subtle")} aria-live="polite">
            {length}/{maxLength}
          </span>
        ) : undefined
      }
    >
      <textarea
        ref={(el) => {
          inner.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        id={inputId}
        rows={minRows}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        onChange={(e) => {
          setLength(e.target.value.length);
          resize();
          onChange?.(e);
        }}
        className={cn(control, "resize-none py-2.5 leading-relaxed", className)}
        {...rest}
      />
    </FieldWrap>
  );
});

export function Select({
  label,
  hint,
  error,
  id,
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: ReactNode; hint?: ReactNode; error?: string }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldWrap label={label} hint={hint} error={error} id={inputId}>
      <select id={inputId} className={cn(control, "h-11 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239a9187' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...rest}>
        {children}
      </select>
    </FieldWrap>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  name,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  name?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-body font-medium text-fg">
          {label}
        </label>
        {description && <p className="text-caption text-fg-muted">{description}</p>}
      </div>
      {name && <input type="hidden" name={name} value={checked ? "on" : "off"} />}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-primary" : "bg-surface-sunken",
        )}
      >
        <span className={cn("inline-block size-5.5 rounded-full bg-white shadow-1 transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
      </button>
    </div>
  );
}
