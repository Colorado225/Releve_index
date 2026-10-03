import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function CollapsibleCard({
    title,
    icon,
    action,
    children,
    className = "",
    defaultOpen = false,
}: {
    title?: string;
    icon?: IconName;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <section
            className={`relative w-full gap-6 overflow-visible pb-1 rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 ${className}`}
        >
            <div className="p-4">
                <header className="mb-3 flex items-center justify-between gap-2">
                    {title && (
                        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {icon && (
                                <Icon
                                    name={icon}
                                    className="h-4 w-4 text-teal-600 dark:text-teal-400"
                                />
                            )}
                            {title}
                        </h2>
                    )}
                    {action && (
                        <div className="flex items-center gap-2">
                            {action}
                        </div>
                    )}
                </header>

                <div
                    className={`relative space-y-5 overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? "max-h-[600px]" : "max-h-48"}`}
                >
                    {children}

                    {/* Faded background effect for collapsed state */}
                    <div
                        className={`from-white dark:from-slate-900 pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-b-lg bg-gradient-to-t to-transparent transition-opacity duration-300 ${isOpen ? "opacity-0" : "opacity-100"}`}
                    />
                </div>

                {/* Toggle button */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                    <button
                        className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 p-2 transition-colors"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label={isOpen ? "Réduire la carte" : "Déplier la carte"}
                    >
                        <svg
                            aria-hidden="true"
                            className={`h-4 w-4 transition-transform duration-300 text-slate-600 dark:text-slate-400 ${isOpen ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>
        </section>
    );
}