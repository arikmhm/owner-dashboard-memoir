import { Loader2 } from "lucide-react";

export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2
        className="h-5 w-5 animate-spin text-zinc-400"
        aria-label="Memuat..."
      />
    </div>
  );
}
