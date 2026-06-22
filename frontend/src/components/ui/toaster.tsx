import { useAppStore } from "@/store/app-store";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

function Toaster() {
  const toasts = useAppStore((state) => state.toasts);
  const removeToast = useAppStore((state) => state.removeToast);

  return (
    <ToastProvider>
      {toasts.map(({ id, title, message, status }) => (
        <Toast
          key={id}
          variant={status === "error" ? "destructive" : "default"}
          onOpenChange={(open) => {
            if (!open) removeToast(id);
          }}
        >
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            <ToastDescription>{message}</ToastDescription>
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}

export { Toaster };
