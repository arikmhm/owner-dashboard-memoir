"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/components/auth-provider";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isAuthenticated } = useAuth();

  // Show loading spinner while auth state is being resolved
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2
          className="h-5 w-5 animate-spin text-zinc-400"
          aria-label="Memuat..."
        />
      </div>
    );
  }

  // AuthProvider will handle redirect to /login if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-white">
        <AppSidebar />
        <main className="flex-1 min-w-0 px-8 py-8">
          <div className="max-w-6xl w-full mx-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
