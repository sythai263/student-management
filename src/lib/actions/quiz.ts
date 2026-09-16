"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@lib/supabase";
import { joinQuizSchema, saveQuizSchema, saveQuizResultsSchema } from "@schemas";
import type {
  Quiz,
  QuizQuestion,
  QuizSession,
  QuizSessionInfo,
} from "@types";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

const uuid = z.string().uuid();

/** Server Action: create or update a quiz together with its questions.
 *  Questions are fully replaced (simplest consistent CRUD). */
export async function saveQuiz(input: unknown): Promise<ActionResult<Quiz>> {
  return withAction(async () => {
    const { supabase, user } = await requireTeacher();

    const parsed = saveQuizSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }
    const { id, title, description, questions } = parsed.data;

    let quizId = id;
    if (quizId) {
      const { error } = await supabase
        .from("quizzes")
        .update({ title, description: description ?? null, updatedAt: new Date().toISOString() })
        .eq("id", quizId);
      if (error) throw new Error(error.message);
      const { error: delError } = await supabase
        .from("quizQuestions")
        .delete()
        .eq("quizId", quizId);
      if (delError) throw new Error(delError.message);
    } else {
      const { data, error } = await supabase
        .from("quizzes")
        .insert({ teacherId: user.id, title, description: description ?? null })
        .select()
        .single();
      if (error) throw new Error(error.message);
      quizId = (data as Quiz).id;
    }

    const rows = questions.map((q, i) => ({
      quizId: quizId!,
      orderIndex: i,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      timeLimit: q.timeLimit,
    }));
    const { error: insError } = await supabase.from("quizQuestions").insert(rows);
    if (insError) throw new Error(insError.message);

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select()
      .eq("id", quizId!)
      .single();
    if (quizError) throw new Error(quizError.message);
    return quiz as Quiz;
  });
}

/** Server Action: delete a quiz (questions, sessions, results cascade). */
export async function deleteQuiz(quizId: string): Promise<ActionResult<null>> {
  return withAction(async () => {
    const { supabase } = await requireTeacher();
    const parsed = uuid.safeParse(quizId);
    if (!parsed.success) throw new Error("Quiz không hợp lệ");
    const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
    if (error) throw new Error(error.message);
    return null;
  });
}

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Server Action: open a new live session for a quiz. Retries on PIN
 *  collision — a unique partial index guarantees one live room per PIN. */
export async function createQuizSession(
  quizId: string,
): Promise<ActionResult<{ sessionId: string; pinCode: string }>> {
  return withAction(async () => {
    const { supabase } = await requireTeacher();
    if (!uuid.safeParse(quizId).success) throw new Error("Quiz không hợp lệ");

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("id")
      .eq("id", quizId)
      .single();
    if (quizError || !quiz) throw new Error("Không tìm thấy quiz");

    const { count } = await supabase
      .from("quizQuestions")
      .select("id", { count: "exact", head: true })
      .eq("quizId", quizId);
    if (!count) throw new Error("Quiz chưa có câu hỏi nào");

    let lastError: string | null = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const pinCode = generatePin();
      const { data, error } = await supabase
        .from("quizSessions")
        .insert({ quizId, pinCode, status: "waiting" })
        .select("id,pinCode")
        .single();
      if (!error && data) {
        return { sessionId: data.id as string, pinCode: data.pinCode as string };
      }
      if (error?.code !== "23505") {
        throw new Error(error?.message ?? "Không tạo được phòng");
      }
      lastError = error.message;
    }
    throw new Error(lastError ?? "Không tạo được phòng, thử lại sau");
  });
}

export interface HostSessionData {
  session: QuizSession;
  quiz: Quiz;
  questions: QuizQuestion[];
}

/** Server Action: everything the host view needs on mount. */
export async function getHostSessionData(
  sessionId: string,
): Promise<ActionResult<HostSessionData>> {
  return withAction(async () => {
    const { supabase } = await requireTeacher();
    if (!uuid.safeParse(sessionId).success) throw new Error("Phòng không hợp lệ");

    const { data: session, error: sError } = await supabase
      .from("quizSessions")
      .select("*")
      .eq("id", sessionId)
      .single();
    if (sError || !session) throw new Error("Không tìm thấy phòng");

    const [{ data: quiz, error: qError }, { data: questions, error: qsError }] =
      await Promise.all([
        supabase.from("quizzes").select("*").eq("id", session.quizId).single(),
        supabase
          .from("quizQuestions")
          .select("*")
          .eq("quizId", session.quizId)
          .order("orderIndex"),
      ]);
    if (qError || !quiz) throw new Error("Không tìm thấy quiz");
    if (qsError) throw new Error(qsError.message);

    return {
      session: session as QuizSession,
      quiz: quiz as Quiz,
      questions: (questions ?? []) as QuizQuestion[],
    };
  });
}

/** Server Action: store the host's ephemeral ECDSA public key (JWK) on
 *  the session so players can verify signed Broadcast commands. */
export async function setSessionHostKey(
  sessionId: string,
  publicKeyJwk: JsonWebKey,
): Promise<ActionResult<null>> {
  return withAction(async () => {
    const { supabase } = await requireTeacher();
    if (!uuid.safeParse(sessionId).success) throw new Error("Phòng không hợp lệ");
    const { error } = await supabase
      .from("quizSessions")
      .update({ hostPublicKey: publicKeyJwk })
      .eq("id", sessionId);
    if (error) throw new Error(error.message);
    return null;
  });
}

/** Server Action: move the session to a question (sets status to
 *  `playing` and records when the question ends so rejoining players
 *  can resume mid-question via get_quiz_session_state). */
export async function advanceQuizQuestion(
  sessionId: string,
  questionIndex: number,
  endsAt: string,
): Promise<ActionResult<null>> {
  return withAction(async () => {
    const { supabase } = await requireTeacher();
    if (!uuid.safeParse(sessionId).success) throw new Error("Phòng không hợp lệ");
    const { error } = await supabase
      .from("quizSessions")
      .update({
        status: "playing",
        currentQuestionIndex: questionIndex,
        questionEndsAt: endsAt,
      })
      .eq("id", sessionId)
      .neq("status", "finished");
    if (error) throw new Error(error.message);
    return null;
  });
}

/** Server Action: end the session — batch-insert the aggregated
 *  scoreboard and mark the room finished/closed. */
export async function finishQuizSession(
  input: unknown,
): Promise<ActionResult<null>> {
  return withAction(async () => {
    const { supabase } = await requireTeacher();

    const parsed = saveQuizResultsSchema.safeParse(input);
    if (!parsed.success) throw new Error("Dữ liệu không hợp lệ");
    const { sessionId, results } = parsed.data;

    if (results.length > 0) {
      const rows = results.map((r) => ({
        sessionId,
        playerId: r.playerId,
        playerName: r.playerName,
        totalScore: r.totalScore,
        correctCount: r.correctCount,
      }));
      const { error: insError } = await supabase
        .from("quizSessionResults")
        .upsert(rows, { onConflict: "sessionId,playerId" });
      if (insError) throw new Error(insError.message);
    }

    const { error } = await supabase
      .from("quizSessions")
      .update({ status: "finished", closedAt: new Date().toISOString() })
      .eq("id", sessionId)
      .neq("status", "finished");
    if (error) throw new Error(error.message);
    return null;
  });
}

// ------------------------------------------------------------------
// Anonymous player entry points — no requireTeacher(). These only call
// SECURITY DEFINER RPCs that return safe fields; table access is denied
// to anon by RLS.
// ------------------------------------------------------------------

/** Server Action (public): resolve a 6-digit PIN to a live session. */
export async function joinQuizByPin(
  input: unknown,
): Promise<ActionResult<QuizSessionInfo>> {
  return withAction(async () => {
    const parsed = joinQuizSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Mã PIN không hợp lệ");
    }
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("join_quiz_session", {
      p_pin: parsed.data.pin,
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Mã PIN không đúng hoặc phòng đã đóng");
    return data as QuizSessionInfo;
  });
}

/** Server Action (public): reconnect-safe session state for a player
 *  that already holds a sessionId (refresh / direct link). */
export async function getQuizSessionState(
  sessionId: string,
): Promise<ActionResult<QuizSessionInfo>> {
  return withAction(async () => {
    if (!uuid.safeParse(sessionId).success) throw new Error("Phòng không hợp lệ");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("get_quiz_session_state", {
      p_session_id: sessionId,
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Phòng đã đóng hoặc không tồn tại");
    return data as QuizSessionInfo;
  });
}
