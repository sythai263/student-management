"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Subject } from "@types";
import { createSubjectSchema, createSubjectsFromCatalogSchema } from "@schemas";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

/** Server Action: create a subject owned by the current teacher. */
export async function createSubject(
  input: unknown,
): Promise<ActionResult<Subject>> {
  const result = await withAction(async () => {
    const { supabase, user } = await requireTeacher();

    const parsed = createSubjectSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { data, error } = await supabase
      .from("subjects")
      .insert({ ...parsed.data, teacherId: user.id })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Subject;
  });

  if (result.success) revalidatePath("/subjects");
  return result;
}

/** Server Action: delete a subject owned by the current teacher. */
export async function deleteSubject(
  id: unknown,
): Promise<ActionResult<void>> {
  const result = await withAction(async () => {
    const { supabase, user } = await requireTeacher();

    const parsed = z.string().uuid("Môn học không hợp lệ").safeParse(id);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", parsed.data)
      .eq("teacherId", user.id);
    if (error) throw new Error(error.message);
  });

  if (result.success) revalidatePath("/subjects");
  return result;
}

/** Server Action: create multiple subjects selected from the built-in catalog. */
export async function createSubjectsFromCatalog(
  input: unknown,
): Promise<ActionResult<Subject[]>> {
  const result = await withAction(async () => {
    const { supabase, user } = await requireTeacher();

    const parsed = createSubjectsFromCatalogSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { data: catalogItems, error: catalogError } = await supabase
      .from("subjectCatalog")
      .select("name, code")
      .in("name", parsed.data);
    if (catalogError) throw new Error(catalogError.message);

    const selected = (catalogItems ?? []) as { name: string; code: string | null }[];
    if (selected.length === 0) {
      throw new Error("Không có môn nào trong danh mục");
    }

    const selectedNames = selected.map((s) => s.name);
    const { data: existing } = await supabase
      .from("subjects")
      .select("name")
      .eq("teacherId", user.id)
      .in("name", selectedNames);

    const existingNames = new Set(existing?.map((s) => s.name) ?? []);
    const missing = selected.filter((s) => !existingNames.has(s.name));
    if (missing.length === 0) {
      return [] as Subject[];
    }

    const { data, error } = await supabase
      .from("subjects")
      .insert(
        missing.map((s) => ({ name: s.name, code: s.code, teacherId: user.id })),
      )
      .select();
    if (error) throw new Error(error.message);
    return (data ?? []) as Subject[];
  });

  if (result.success) revalidatePath("/subjects");
  return result;
}
