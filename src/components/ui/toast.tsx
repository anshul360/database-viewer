'use client';

import { ReactNode, useEffect } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';

interface ToastProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
  duration?: number;
  action?: ReactNode;
}

export function Toast({
  open,
  setOpen,
  title,
  description,
  variant = 'default',
  duration = 5000,
  action,
}: ToastProps) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setOpen(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [open, duration, setOpen]);

  const variantStyles = {
    default: 'border-gray-200 bg-white text-gray-900',
    success: 'border-green-200 bg-green-50 text-green-900',
    error: 'border-red-200 bg-red-50 text-red-900',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-900',
  };

  return (
    <ToastPrimitive.Provider>
      <ToastPrimitive.Root
        open={open}
        onOpenChange={setOpen}
        className={`fixed bottom-4 right-4 z-50 w-full max-w-sm rounded-lg border p-4 shadow-md ${variantStyles[variant]}`}
      >
        <ToastPrimitive.Title className="font-medium">{title}</ToastPrimitive.Title>
        {description && (
          <ToastPrimitive.Description className="mt-1 text-sm">
            {description}
          </ToastPrimitive.Description>
        )}
        {action && <div className="mt-2">{action}</div>}
      </ToastPrimitive.Root>
      <ToastPrimitive.Viewport />
    </ToastPrimitive.Provider>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <ToastPrimitive.Provider>
      {children}
      <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex flex-col p-6 gap-2" />
    </ToastPrimitive.Provider>
  );
}