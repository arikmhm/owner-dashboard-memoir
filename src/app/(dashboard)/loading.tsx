import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2
        className="h-5 w-5 animate-spin text-zinc-400"
        aria-label="Memuat..."
      />
    </div>
  );
}
