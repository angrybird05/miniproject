import { createContext, useContext, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

const ToastContext = createContext({ toast: () => {} });

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const value = useMemo(
    () => ({
      toast: ({ title, description }) => {
        const id = crypto.randomUUID();
        setItems((current) => [...current, { id, title, description }]);
        window.setTimeout(() => {
          setItems((current) => current.filter((item) => item.id !== id));
        }, 3000);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[320px] flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="glass animate-fadeUp rounded-2xl p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-sm text-slate-500">{item.description}</p>
              </div>
              <button
                className="text-slate-400 transition hover:text-slate-600"
                onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
