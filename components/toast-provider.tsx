"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

export function ToastProvider() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      position="bottom-right"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      richColors
      closeButton
      gap={10}
      toastOptions={{
        style: {
          fontFamily: '"Manrope", ui-sans-serif, system-ui, sans-serif',
          borderRadius: "12px",
          border: "1px solid var(--border)",
          fontSize: "14px",
        },
      }}
    />
  );
}
