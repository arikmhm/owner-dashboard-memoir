// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Health Check Endpoint
// GET /api/health — readiness check for monitoring & deployment verification
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      version: packageJson.version,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
