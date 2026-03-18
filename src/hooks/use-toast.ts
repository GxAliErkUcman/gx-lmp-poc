import { toast as sonnerToast } from "sonner";

// Compatibility layer: wraps sonner with the old shadcn/use-toast API.
// All notifications now render through a single system (Sonner).

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  [key: string]: unknown;
}

function toast(options: ToastOptions) {
  const message = options.description || options.title || "";
  const title = options.description ? options.title : undefined;

  if (options.variant === "destructive") {
    sonnerToast.error(message, { description: title !== message ? undefined : undefined });
  } else if (
    options.title?.toLowerCase().includes("success") ||
    options.title?.toLowerCase().includes("saved") ||
    options.title?.toLowerCase().includes("updated") ||
    options.title?.toLowerCase().includes("deleted") ||
    options.title?.toLowerCase().includes("created")
  ) {
    sonnerToast.success(message);
  } else {
    sonnerToast(message);
  }

  return { id: "", dismiss: () => {}, update: () => {} };
}

function useToast() {
  return {
    toast,
    toasts: [] as unknown[],
    dismiss: () => {},
  };
}

export { useToast, toast };
