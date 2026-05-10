"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#18181b",
          "--normal-border": "#e4e4e7",
          "--success-bg": "#ffffff",
          "--success-text": "#18181b",
          "--success-border": "#e4e4e7",
          "--error-bg": "#ffffff",
          "--error-text": "#18181b",
          "--error-border": "#e4e4e7",
          "--warning-bg": "#ffffff",
          "--warning-text": "#18181b",
          "--warning-border": "#e4e4e7",
          "--info-bg": "#ffffff",
          "--info-text": "#18181b",
          "--info-border": "#e4e4e7",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{ duration: 3000 }}
      {...props}
    />
  );
};

export { Toaster };
