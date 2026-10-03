import type { ReactNode } from "react";

interface FieldProps {
    label: string;
    children: ReactNode;
    error?: string;
    disabled?: boolean;
    className?: string;
    helper?: string;
}

export function Field({
    label,
    children,
    error,
    disabled = false,
    className = "",
    helper,
}: FieldProps) {
    return (
        <div
            className={`block w-full ${disabled ? "opacity-60 pointer-events-none" : ""} ${className}`}
            data-disabled={disabled}
        >
            <span className="mb-1.5 block text-xs font-medium text-slate-500">
                {label}
            </span>
            {children}
            {helper && !error && (
                <p className="mt-1.5 text-xs text-slate-500">{helper}</p>
            )}
            {error && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>
            )}
        </div>
    );
}