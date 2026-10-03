import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function Card({
  title,
  icon,
  action,
  children,
  className = "",
}: {
  title?: string;
  icon?: IconName;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="p-3 sm:p-4">
        {title && (
          <header className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {icon && (
                <Icon
                  name={icon}
                  className="h-4 w-4 text-teal-600 dark:text-teal-400"
                />
              )}
              {title}
            </h2>
            {action}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}