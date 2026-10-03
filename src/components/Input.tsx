interface InputProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    type?: string;
    step?: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function Input({
    value,
    onChange,
    type = "text",
    step,
    placeholder,
    disabled = false,
    className = "",
}: InputProps) {
    return (
        <input
            type={type}
            step={step}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-slate-900 placeholder-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        />
    );
}