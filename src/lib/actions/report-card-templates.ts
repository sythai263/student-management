"use server";

import type { ReportCardBlock, ReportCardTemplateRow } from "@types";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

export interface SaveReportCardTemplateInput {
  id?: string;
  name: string;
  blocks: ReportCardBlock[];
}

/** Server Action: create or update one of the teacher's report card templates. */
export async function saveReportCardTemplate(
  input: SaveReportCardTemplateInput,
): Promise<ActionResult<ReportCardTemplateRow>> {
  return withAction(async () => {
    if (!input.name.trim()) throw new Error("Tên mẫu không được để trống");
    if (!input.blocks.length) throw new Error("Mẫu phiếu điểm chưa có nội dung nào");

    const { supabase, user } = await requireTeacher();
    const row = {
      teacherId: user.id,
      name: input.name.trim(),
      blocks: input.blocks,
      updatedAt: new Date().toISOString(),
    };

    const query = input.id
      ? supabase
          .from("reportCardTemplates")
          .update(row)
          .eq("id", input.id)
          .eq("teacherId", user.id)
      : supabase.from("reportCardTemplates").insert(row);

    const { data, error } = await query.select("*").single();
    if (error) throw new Error(error.message);
    return data as ReportCardTemplateRow;
  });
}

/** Server Action: delete a report card template owned by the teacher. */
export async function deleteReportCardTemplate(
  id: string,
): Promise<ActionResult<null>> {
  return withAction(async () => {
    const { supabase, user } = await requireTeacher();
    const { error } = await supabase
      .from("reportCardTemplates")
      .delete()
      .eq("id", id)
      .eq("teacherId", user.id);
    if (error) throw new Error(error.message);
    return null;
  });
}

/**
 * Server Action: mark a template as the default used to print report
 * cards. Only one default per teacher — clears any previous default.
 */
export async function setDefaultReportCardTemplate(
  id: string,
): Promise<ActionResult<null>> {
  return withAction(async () => {
    const { supabase, user } = await requireTeacher();

    const { error: clearError } = await supabase
      .from("reportCardTemplates")
      .update({ isDefault: false })
      .eq("teacherId", user.id);
    if (clearError) throw new Error(clearError.message);

    const { error } = await supabase
      .from("reportCardTemplates")
      .update({ isDefault: true })
      .eq("id", id)
      .eq("teacherId", user.id);
    if (error) throw new Error(error.message);
    return null;
  });
}
