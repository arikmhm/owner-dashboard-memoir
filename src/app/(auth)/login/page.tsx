"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/components/auth-provider";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";

// ── Zod schema (matches backend validation) ──────────────────────────────────

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ── Error mapping ────────────────────────────────────────────────────────────

/**
 * Map API error to user-friendly message.
 * - 401 → generic credential error (no info leak)
 * - 429 → rate limit feedback
 * - 500+ → generic server error
 */
function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 401:
        return "Email atau password salah";
      case 429:
        return "Terlalu banyak percobaan, coba lagi nanti";
      default:
        return err.message || "Terjadi kesalahan, coba lagi nanti";
    }
  }
  return "Terjadi kesalahan, coba lagi nanti";
}

// ── Page component ───────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login, isLoading: authLoading } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setApiError(null);
    try {
      await login({ email: data.email.trim(), password: data.password });
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const isFormDisabled = isSubmitting || authLoading;

  // Show nothing while checking auth state (prevents flash)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2
          className="h-5 w-5 animate-spin text-zinc-400"
          aria-label="Memuat..."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / Brand */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            memoir<span className="text-zinc-300">.</span>
          </h1>
          <p className="text-sm text-zinc-500">Owner Dashboard</p>
        </div>

        {/* Login Card */}
        <Card className="border-zinc-200 shadow-none rounded-sm">
          <CardContent className="pt-6 pb-6 px-6">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
              aria-label="Form login"
            >
              {/* API Error alert */}
              {apiError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-sm border border-red-200 bg-red-50 px-3 py-2.5"
                >
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{apiError}</p>
                </div>
              )}

              {/* Email field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="text-xs font-medium text-zinc-600 uppercase tracking-wider"
                >
                  Email
                </label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="kamu@studio.id"
                  autoComplete="email"
                  disabled={isFormDisabled}
                  aria-invalid={!!errors.email || !!apiError}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="text-xs font-medium text-zinc-600 uppercase tracking-wider"
                >
                  Password
                </label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isFormDisabled}
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isFormDisabled}
                className="w-full"
                size="default"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Masuk"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer note */}
        <p className="text-xs text-zinc-400 text-center">
          Belum punya akun? Hubungi tim memoir.
        </p>
      </div>
    </div>
  );
}
