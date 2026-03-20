import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { ApiSuccessResponse } from "@/lib/api";
import type {
  Template,
  TemplateElement,
  UpdateTemplateRequest,
  AssetFolder,
  AssetUploadResponse,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Template Management Hooks
// TanStack Query data fetching + mutations for EPIC-OD-04
// Best practices: client-query-dedup, async-parallel, optimistic-updates
// ─────────────────────────────────────────────────────────────────────────────

// ── Query Keys ───────────────────────────────────────────────────────────────

const TEMPLATES_KEY = ["/owner/templates"] as const;
const templateKey = (id: string) => [`/owner/templates/${id}`] as const;
const elementsKey = (templateId: string) =>
  [`/owner/templates/${templateId}/elements`] as const;

// ── Response type for detail endpoint (template + embedded elements) ─────────

type TemplateDetailResponse = Template & { elements: TemplateElement[] };

// Runtime shape of templates from the list endpoint (includes embedded elements)
type TemplateListItem = Template & { elements?: TemplateElement[] };

// ── Template List Hook ───────────────────────────────────────────────────────

export interface UseTemplatesReturn {
  /** All templates owned by the current user */
  templates: Template[];
  /** Whether data is loading for the first time */
  isLoading: boolean;
  /** Error from fetching */
  error: Error | null;
  /** Revalidate template list */
  refresh: () => void;
  /** Toggle template active/inactive */
  toggleActive: (id: string, currentActive: boolean) => Promise<void>;
  /** Delete a template */
  deleteTemplate: (id: string) => Promise<void>;
  /** Whether a mutation is in progress */
  isMutating: boolean;
}

export function useTemplates(): UseTemplatesReturn {
  const queryClient = useQueryClient();

  const {
    data: rawTemplates,
    error,
    isLoading,
  } = useQuery<TemplateListItem[]>({
    queryKey: TEMPLATES_KEY,
    staleTime: 60_000,
  });

  // Seed per-template element caches from the embedded elements
  // in the list response (eliminates N+1 queries per card).
  const templates: Template[] = (rawTemplates ?? []).map((t) => {
    if (t.elements && t.elements.length > 0) {
      queryClient.setQueryData<TemplateElement[]>(
        elementsKey(t.id),
        t.elements,
      );
    }
    // Strip embedded elements to produce a clean Template
    const { elements: _unused, ...template } = t;
    return template;
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateTemplateRequest;
    }): Promise<Template> => {
      const res = await api.patch<
        ApiSuccessResponse<{ template: Template }>
      >(`/owner/templates/${id}`, data);
      return res.data.template;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: TEMPLATES_KEY });
      const previous = queryClient.getQueryData<Template[]>(TEMPLATES_KEY);
      queryClient.setQueryData<Template[]>(TEMPLATES_KEY, (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, ...data } : t)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(TEMPLATES_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/owner/templates/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: TEMPLATES_KEY });
      const previous = queryClient.getQueryData<Template[]>(TEMPLATES_KEY);
      queryClient.setQueryData<Template[]>(TEMPLATES_KEY, (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(TEMPLATES_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });

  const toggleActive = async (id: string, currentActive: boolean) => {
    await updateMutation.mutateAsync({
      id,
      data: { isActive: !currentActive },
    });
  };

  const deleteTemplate = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    templates: templates,
    isLoading,
    error: (error as Error) ?? null,
    refresh: () => queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY }),
    toggleActive,
    deleteTemplate,
    isMutating: updateMutation.isPending || deleteMutation.isPending,
  };
}

// ── Template Elements Only Hook (for preview / list) ─────────────────────────

export function useTemplateElements(templateId: string | null) {
  const { data, isLoading } = useQuery<TemplateElement[]>({
    queryKey: templateId ? elementsKey(templateId) : ["noop"],
    enabled: !!templateId,
    staleTime: 60_000,
  });
  return {
    elements: [...(data ?? [])].sort((a, b) => a.sequence - b.sequence),
    isLoading,
  };
}

// ── Single Template + Elements Hook (for editor) ─────────────────────────────

export interface UseTemplateDetailReturn {
  /** Template data */
  template: Template | null;
  /** Template elements sorted by sequence */
  elements: TemplateElement[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Error from fetching */
  error: Error | null;
  /** Revalidate template data */
  refresh: () => void;
}

/**
 * Split a detail response into template metadata and sorted elements.
 */
function extractDetailData(raw: TemplateDetailResponse | undefined): {
  template: Template | null;
  elements: TemplateElement[];
} {
  if (!raw) return { template: null, elements: [] };
  const { elements: rawElements, ...template } = raw;
  return {
    template,
    elements: [...rawElements].sort((a, b) => a.sequence - b.sequence),
  };
}

/**
 * Fetch single template detail.
 * GET /owner/templates/:id returns { data: { template: { ...fields, elements } } }
 */
export function useTemplateDetail(id: string | null): UseTemplateDetailReturn {
  const queryClient = useQueryClient();

  const { data, error, isLoading } = useQuery<TemplateDetailResponse>({
    queryKey: id ? templateKey(id) : ["noop"],
    queryFn: async () => {
      const res = await api.get<
        ApiSuccessResponse<{ template: TemplateDetailResponse }>
      >(`/owner/templates/${id}`);
      return res.data.template;
    },
    enabled: !!id,
    staleTime: 60_000,
    // Seed from cached list data for instant rendering when navigating from list
    placeholderData: () => {
      const listData =
        queryClient.getQueryData<TemplateListItem[]>(TEMPLATES_KEY);
      const match = listData?.find((t) => t.id === id);
      if (!match?.elements) return undefined;
      return match as TemplateDetailResponse;
    },
  });

  // Use defensive extraction that handles both flat & nested shapes
  const { template, elements } = extractDetailData(data);

  return {
    template,
    elements,
    isLoading,
    error: (error as Error) ?? null,
    refresh: () => {
      if (id) queryClient.invalidateQueries({ queryKey: templateKey(id) });
    },
  };
}

// ── Template Save Operations ─────────────────────────────────────────────────

export interface TemplateSaveData {
  name: string;
  width: number;
  height: number;
  backgroundUrl: string;
  overlayUrl?: string | null;
  overridePriceBase?: number | null;
  overridePriceExtraPrint?: number | null;
  overridePriceDigitalCopy?: number | null;
  isActive: boolean;
  elements: Array<{
    id?: string; // existing element ID (for edit mode)
    elementType: string;
    sequence: number;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    properties: Record<string, unknown>;
  }>;
}

/**
 * Create a new template with all its elements.
 * POST /owner/templates returns { data: { template: Template } }.
 * Creates template first, then batch-creates elements sequentially.
 */
export async function createTemplateWithElements(
  data: TemplateSaveData,
): Promise<Template> {
  // 1. Create the template
  const res = await api.post<ApiSuccessResponse<{ template: Template }>>(
    "/owner/templates",
    {
      name: data.name,
      width: data.width,
      height: data.height,
      backgroundUrl: data.backgroundUrl,
      overlayUrl: data.overlayUrl ?? null,
      overridePriceBase: data.overridePriceBase ?? null,
      overridePriceExtraPrint: data.overridePriceExtraPrint ?? null,
      overridePriceDigitalCopy: data.overridePriceDigitalCopy ?? null,
      isActive: data.isActive,
    },
  );

  const created = res.data.template;
  const templateId = created.id;

  // 2. Create elements sequentially (avoids potential 409 CONFLICT race
  //    conditions on unique sequence constraint).
  if (data.elements.length > 0) {
    console.log(
      `[createTemplateWithElements] Creating ${data.elements.length} elements for template ${templateId}`,
    );
    for (const el of data.elements) {
      const payload = {
        elementType: el.elementType,
        sequence: el.sequence,
        x: Math.round(el.x),
        y: Math.round(el.y),
        width: Math.round(el.width),
        height: Math.round(el.height),
        rotation: Math.round(el.rotation),
        opacity: Math.round(el.opacity),
        properties: el.properties,
      };
      console.log(
        `[createTemplateWithElements] POST element seq=${el.sequence}`,
        payload,
      );
      const elRes = await api.post(
        `/owner/templates/${templateId}/elements`,
        payload,
      );
      console.log(
        `[createTemplateWithElements] Element seq=${el.sequence} created:`,
        elRes,
      );
    }
  }

  return created;
}

/**
 * Update an existing template and sync its elements.
 * PATCH /owner/templates/:id returns { data: { template: Template } }.
 * Handles element creation, updating, and deletion.
 */
export async function updateTemplateWithElements(
  templateId: string,
  data: TemplateSaveData,
  existingElements: TemplateElement[],
): Promise<Template> {
  // 1. Update template metadata
  const templatePromise = api.patch<
    ApiSuccessResponse<{ template: Template }>
  >(`/owner/templates/${templateId}`, {
    name: data.name,
    width: data.width,
    height: data.height,
    backgroundUrl: data.backgroundUrl,
    overlayUrl: data.overlayUrl ?? null,
    overridePriceBase: data.overridePriceBase ?? null,
    overridePriceExtraPrint: data.overridePriceExtraPrint ?? null,
    overridePriceDigitalCopy: data.overridePriceDigitalCopy ?? null,
    isActive: data.isActive,
  });

  // 2. Determine element changes
  // existingIds holds UUIDs from the database.
  // New elements added in the editor have local IDs like "el_3" which are NOT in existingIds.
  const existingIds = new Set(existingElements.map((e) => e.id));
  const newElementIds = new Set(
    data.elements
      .filter((e) => e.id && existingIds.has(e.id))
      .map((e) => e.id!),
  );

  // Elements to create: no ID, OR ID not in existing (i.e. local editor IDs like "el_3")
  const toCreate = data.elements.filter((e) => !e.id || !existingIds.has(e.id));

  // Elements to update (have valid existing DB ID and still present)
  const toUpdate = data.elements.filter((e) => e.id && existingIds.has(e.id));

  // Elements to delete (existed but no longer in data)
  const toDelete = existingElements.filter((e) => !newElementIds.has(e.id));

  console.log(
    `[updateTemplateWithElements] CUD diff: create=${toCreate.length}, update=${toUpdate.length}, delete=${toDelete.length}`,
  );

  // 3. Wait for template PATCH first, then handle elements sequentially
  //    (avoids potential 409 CONFLICT race on unique sequence constraint).
  const elementsEndpoint = `/owner/templates/${templateId}/elements`;
  await templatePromise;

  // Deletes first (frees up sequences), then updates, then creates
  for (const el of toDelete) {
    console.log(`[updateTemplateWithElements] DELETE element ${el.id}`);
    await api.delete(`${elementsEndpoint}/${el.id}`);
  }

  for (const el of toUpdate) {
    const payload = {
      sequence: el.sequence,
      x: Math.round(el.x),
      y: Math.round(el.y),
      width: Math.round(el.width),
      height: Math.round(el.height),
      rotation: Math.round(el.rotation),
      opacity: Math.round(el.opacity),
      properties: el.properties,
    };
    console.log(`[updateTemplateWithElements] PATCH element ${el.id}`, payload);
    await api.patch(`${elementsEndpoint}/${el.id}`, payload);
  }

  for (const el of toCreate) {
    const payload = {
      elementType: el.elementType,
      sequence: el.sequence,
      x: Math.round(el.x),
      y: Math.round(el.y),
      width: Math.round(el.width),
      height: Math.round(el.height),
      rotation: Math.round(el.rotation),
      opacity: Math.round(el.opacity),
      properties: el.properties,
    };
    console.log(
      `[updateTemplateWithElements] POST element seq=${el.sequence}`,
      payload,
    );
    await api.post(elementsEndpoint, payload);
  }

  const templateResult = await templatePromise;
  return templateResult.data.template;
}

export { ApiError };

// ── Asset Upload ─────────────────────────────────────────────────────────────

/**
 * Convert a data URL to a Blob for upload.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}

/**
 * Upload an asset to Supabase Storage via the backend API.
 * @param file - File or Blob to upload
 * @param folder - Asset folder: backgrounds, overlays, or elements
 * @returns The public URL of the uploaded asset
 */
export async function uploadAsset(
  file: File | Blob,
  folder: AssetFolder,
  filename?: string,
): Promise<string> {
  const res = await api.uploadFile<ApiSuccessResponse<AssetUploadResponse>>(
    `/owner/assets/upload?folder=${folder}`,
    file,
    filename,
  );
  return res.data.url;
}

/**
 * Upload a data URL as an asset. Converts to Blob first.
 */
export async function uploadDataUrlAsset(
  dataUrl: string,
  folder: AssetFolder,
): Promise<string> {
  // If it's already a remote URL (not data:), skip upload
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const blob = dataUrlToBlob(dataUrl);
  const ext =
    blob.type === "image/png"
      ? "png"
      : blob.type === "image/webp"
        ? "webp"
        : "jpg";
  return uploadAsset(blob, folder, `asset.${ext}`);
}
