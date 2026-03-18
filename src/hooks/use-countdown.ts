import { useState, useEffect, useCallback } from "react";

/**
 * Countdown hook for QRIS payment expiry.
 * Returns remaining time as mm:ss string and an isExpired flag.
 */
export function useCountdown(expiresAt: string | null) {
  const calcRemaining = useCallback(() => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  }, [expiresAt]);

  const [remaining, setRemaining] = useState(calcRemaining);

  useEffect(() => {
    setRemaining(calcRemaining());

    if (!expiresAt) return;

    const interval = setInterval(() => {
      const next = calcRemaining();
      setRemaining(next);
      if (next <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, calcRemaining]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return {
    /** Formatted remaining time "mm:ss" */
    display,
    /** Total seconds remaining */
    remaining,
    /** Whether the countdown has reached zero */
    isExpired: remaining <= 0 && expiresAt !== null,
  };
}
