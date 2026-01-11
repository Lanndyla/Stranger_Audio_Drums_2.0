import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type GeneratePatternRequest, type InsertPattern } from "@shared/routes";
import { z } from "zod";

// Helper to validate API responses
function validateResponse<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    // For now, return data as T even if validation fails to prevent app crash if schema is slightly off
    // In production, you might want to throw
    return data as T; 
  }
  return result.data;
}

// GET /api/patterns
export function usePatterns() {
  return useQuery({
    queryKey: [api.patterns.list.path],
    queryFn: async () => {
      const res = await fetch(api.patterns.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch patterns");
      const data = await res.json();
      return validateResponse(api.patterns.list.responses[200], data, "patterns.list");
    },
  });
}

// GET /api/patterns/:id
export function usePattern(id: number | null) {
  return useQuery({
    queryKey: [api.patterns.get.path, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.patterns.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pattern");
      const data = await res.json();
      return validateResponse(api.patterns.get.responses[200], data, "patterns.get");
    },
  });
}

// POST /api/patterns
export function useCreatePattern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertPattern) => {
      const res = await fetch(api.patterns.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save pattern");
      const responseData = await res.json();
      return validateResponse(api.patterns.create.responses[201], responseData, "patterns.create");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patterns.list.path] });
    },
  });
}

// DELETE /api/patterns/:id
export function useDeletePattern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.patterns.delete.path, { id });
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete pattern");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patterns.list.path] });
    },
  });
}

// POST /api/patterns/generate
export function useGeneratePattern() {
  return useMutation({
    mutationFn: async (data: GeneratePatternRequest) => {
      const res = await fetch(api.patterns.generate.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate pattern");
      const responseData = await res.json();
      return validateResponse(api.patterns.generate.responses[200], responseData, "patterns.generate");
    },
  });
}

// POST /api/patterns/export-midi
export function useExportMidi() {
  return useMutation({
    mutationFn: async (data: { bpm: number; grid: any[]; timeSignature?: string; stepCount?: number }) => {
      const res = await fetch(api.patterns.exportMidi.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to export MIDI");
      return await res.blob();
    },
  });
}
