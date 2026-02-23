import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-zinc-50">
        <AppSidebar />
        <main className="flex-1 min-w-0 px-8 py-8">
          <div className="max-w-6xl w-full mx-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
