"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteReportCardTemplate,
  saveReportCardTemplate,
  setDefaultReportCardTemplate,
  type SaveReportCardTemplateInput,
} from "@lib/actions";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import { friendlyErrorMessage } from "@lib/utils";
import type { ReportCardTemplateRow } from "@types";

const TEMPLATES_KEY = ["report-card-templates"];

/** Fetch all report card templates owned by the current teacher. */
export function useReportCardTemplates() {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: async (): Promise<ReportCardTemplateRow[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("reportCardTemplates")
        .select("*")
        .order("createdAt", { ascending: true });
      if (error) throw new Error(friendlyErrorMessage(error));
      return (data ?? []) as ReportCardTemplateRow[];
    },
  });
}

/** Fetch a single report card template by id. */
export function useReportCardTemplate(id: string | undefined) {
  return useQuery({
    queryKey: [...TEMPLATES_KEY, id],
    queryFn: async (): Promise<ReportCardTemplateRow> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("reportCardTemplates")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw new Error(friendlyErrorMessage(error));
      return data as ReportCardTemplateRow;
    },
    enabled: !!id,
  });
}

/** Mutation: create or update a report card template. */
export function useSaveReportCardTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveReportCardTemplateInput) => {
      const result = await saveReportCardTemplate(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });
}

/** Mutation: delete a report card template. */
export function useDeleteReportCardTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteReportCardTemplate(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });
}

/** Mutation: set a template as the default used to print report cards. */
export function useSetDefaultReportCardTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await setDefaultReportCardTemplate(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });
}
