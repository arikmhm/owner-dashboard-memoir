// ── Template Variable Registry ─────────────────────────────────────────────────
// Variables available for use in text elements via {{variable_name}} syntax.
// At render time (kiosk/server), these are resolved against actual transaction data.

export interface TemplateVariable {
    key: string;
    label: string;
    category: string;
    example: string;
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
    // Waktu
    { key: "date", label: "Tanggal", category: "Waktu", example: "23 Feb 2026" },
    { key: "time", label: "Jam", category: "Waktu", example: "14:30" },
    { key: "datetime", label: "Tanggal & Jam", category: "Waktu", example: "23 Feb 2026, 14:30" },

    // Branding & Personalisasi
    { key: "owner_name", label: "Nama Studio", category: "Branding", example: "Memoir Studio" },
    { key: "customer_name", label: "Nama Pelanggan", category: "Branding", example: "Budi Santoso" },
];

// ── Dummy context for editor preview ────────────────────────────────────────────
export const DUMMY_RENDER_CONTEXT: Record<string, string> = Object.fromEntries(
    TEMPLATE_VARIABLES.map((v) => [v.key, v.example]),
);

// ── Resolver ────────────────────────────────────────────────────────────────────
/** Replace {{variable}} placeholders with values from context. */
export function resolveVariables(
    content: string,
    context: Record<string, string>,
): string {
    return content.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
        return context[key] ?? match;
    });
}

/** Check if content contains any {{variable}} placeholders. */
export function hasVariables(content: string): boolean {
    return /\{\{\w+\}\}/.test(content);
}

/** Extract all variable keys from content. */
export function extractVariableKeys(content: string): string[] {
    const matches = content.matchAll(/\{\{(\w+)\}\}/g);
    return [...matches].map((m) => m[1]);
}
