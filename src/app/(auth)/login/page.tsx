import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            memoir<span className="text-zinc-400">.</span>
          </h1>
          <p className="text-sm text-zinc-500">Owner Dashboard</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              placeholder="kamu@studio.id"
              className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition"
            />
          </div>
          <Button
            className="w-full bg-zinc-950 text-white hover:bg-zinc-800"
            asChild
          >
            <a href="/">Masuk</a>
          </Button>
        </div>

        <p className="text-xs text-zinc-400 text-center">
          Belum punya akun? Hubungi tim memoir.
        </p>
      </div>
    </div>
  );
}
