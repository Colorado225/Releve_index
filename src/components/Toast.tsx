import { useState, createContext, useContext, ReactNode } from "react";
import { Icon } from "./Icon";

type ToastType = "success" | "error" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: ToastType = "info") => {
        const id = crypto.randomUUID();
        setToasts((prev) => [...prev, { id, message, type }]);
        // Auto-supprimer après 4 secondes
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const getToastStyles = (type: ToastType) => {
        switch (type) {
            case "success":
                return "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700";
            case "error":
                return "bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700";
            default:
                return "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700";
        }
    };

    const getToastIcon = (type: ToastType) => {
        switch (type) {
            case "success":
                return <Icon name="check" className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
            case "error":
                return <Icon name="alert" className="h-5 w-5 text-red-600 dark:text-red-400" />;
            default:
                return <Icon name="info" className="h-5 w-5 text-slate-600 dark:text-slate-400" />;
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Container des toasts en bas à droite */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${getToastStyles(toast.type)} animate-slide-in`}
                    >
                        {getToastIcon(toast.type)}
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{toast.message}</p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="ml-2 rounded-full p-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            <Icon name="close" className="h-4 w-4 text-slate-500" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}