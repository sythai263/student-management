export { cn } from "cn"

const FALLBACK_ERROR_MESSAGE = "Có lỗi xảy ra, vui lòng thử lại.";

const VIETNAMESE_CHAR =
  /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;

/** Postgres unique constraint/index names → teacher-facing messages. */
const UNIQUE_CONSTRAINT_MESSAGES: Record<string, string> = {
  classes_classCode_key: "Mã lớp đã tồn tại",
  classes_teacherId_classCode_key: "Mã lớp đã tồn tại",
  students_studentCode_classId_key: "Mã học sinh đã tồn tại trong lớp này",
  attendanceRecords_sessionId_studentId_key:
    "Học sinh đã có trong buổi điểm danh này",
  subjects_teacherId_name_key: "Tên môn học đã tồn tại",
  subjectCatalog_name_key: "Môn học đã có trong danh mục chuẩn",
  classSubjects_classId_subjectId_key: "Môn học đã được gán vào lớp này",
  gradeSessions_classId_subjectId_name_key: "Đợt chấm điểm này đã tồn tại",
  grades_gradeSessionId_studentId_key: "Học sinh đã có điểm ở cột này",
  grades_studentId_subjectId_semester_scoreType_key:
    "Học sinh đã có điểm loại này",
  teacherSchools_teacherId_name_key: "Tên trường đã tồn tại",
  quizQuestions_quizId_orderIndex_key: "Câu hỏi bị trùng số thứ tự",
  quizSessions_active_pin_idx: "Mã PIN đang được dùng bởi phòng khác",
  quizSessionResults_sessionId_playerId_key:
    "Kết quả của học sinh này đã được lưu",
};

/** Postgres check constraint names → teacher-facing messages. */
const CHECK_CONSTRAINT_MESSAGES: Record<string, string> = {
  attendanceRecords_status_check: "Trạng thái điểm danh không hợp lệ",
  grades_semester_check: "Học kỳ không hợp lệ",
  grades_scoreType_check: "Loại điểm không hợp lệ",
  grades_score_check: "Điểm phải nằm trong khoảng 0–10",
  gradeSessions_semester_check: "Học kỳ không hợp lệ",
  gradeSessions_scoreType_check: "Loại điểm không hợp lệ",
  gradeSessions_weight_check: "Trọng số phải nằm trong khoảng 1–10",
  gradeWeights_weight_check: "Trọng số phải lớn hơn 0",
  quizQuestions_options_check: "Câu hỏi cần từ 2 đến 6 đáp án",
  quizQuestions_correctIndex_check: "Đáp án đúng không hợp lệ",
  quizQuestions_timeLimit_check: "Thời gian trả lời phải từ 5 đến 120 giây",
  quizSessions_status_check: "Trạng thái phòng không hợp lệ",
};

/** Postgres not-null column names → teacher-facing messages. */
const NOT_NULL_COLUMN_MESSAGES: Record<string, string> = {
  classCode: "Mã lớp không được trống",
  name: "Tên không được trống",
  firstName: "Chưa nhập tên học sinh",
  lastName: "Chưa nhập họ và tên đệm",
  schoolYear: "Chưa nhập năm học",
  score: "Chưa nhập điểm",
  title: "Chưa nhập tiêu đề",
};

function rawMessageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (
    err !== null &&
    typeof err === "object" &&
    "message" in err &&
    typeof err.message === "string"
  ) {
    return err.message;
  }
  return "";
}

/**
 * Translate raw Postgres/PostgREST/Auth/network messages into Vietnamese.
 * Returns null when nothing matches so the caller falls back.
 */
function translateRawError(raw: string): string | null {
  const unique = /unique constraint "([^"]+)"/.exec(raw);
  if (unique) {
    return (
      UNIQUE_CONSTRAINT_MESSAGES[unique[1]] ??
      "Dữ liệu bị trùng, vui lòng kiểm tra lại."
    );
  }
  if (/update or delete .* violates foreign key constraint/.test(raw)) {
    return "Không thể xóa vì dữ liệu này còn đang được sử dụng ở nơi khác.";
  }
  if (/violates foreign key constraint/.test(raw)) {
    return "Dữ liệu liên kết không tồn tại — có thể vừa bị xóa, hãy tải lại trang.";
  }
  if (/row.level security/.test(raw)) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }
  const notNull = /null value in column "([^"]+)"/.exec(raw);
  if (notNull) {
    return (
      NOT_NULL_COLUMN_MESSAGES[notNull[1]] ??
      "Thiếu thông tin bắt buộc, vui lòng kiểm tra lại biểu mẫu."
    );
  }
  const check = /check constraint "([^"]+)"/.exec(raw);
  if (check) {
    return (
      CHECK_CONSTRAINT_MESSAGES[check[1]] ??
      (/_(tx\d|gk|ck|score)_check$/.test(check[1])
        ? "Điểm phải nằm trong khoảng 0–10."
        : "Dữ liệu không hợp lệ, vui lòng kiểm tra lại.")
    );
  }
  if (
    /multiple \(or no\) rows returned|Cannot coerce the result to a single JSON object|contains 0 rows/.test(
      raw,
    )
  ) {
    return "Không tìm thấy dữ liệu — có thể đã bị xóa, hãy tải lại trang.";
  }
  if (/invalid input syntax for type uuid/.test(raw)) {
    return "Mã định danh không hợp lệ.";
  }
  if (/invalid input syntax|invalid input value/.test(raw)) {
    return "Dữ liệu không hợp lệ, vui lòng kiểm tra lại.";
  }
  if (/value too long/.test(raw)) return "Nội dung nhập quá dài.";
  if (/schema cache/.test(raw)) {
    return "Dữ liệu chưa đồng bộ — hãy tải lại trang rồi thử lại.";
  }
  if (/permission denied/i.test(raw)) {
    return "Bạn không có quyền truy cập dữ liệu này.";
  }
  if (/jwt expired|token.*expired|refresh_token_not_found|invalid refresh token/i.test(raw)) {
    return "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.";
  }
  if (/invalid login credentials/i.test(raw)) {
    return "Email hoặc mật khẩu không đúng.";
  }
  if (/user already registered/i.test(raw)) {
    return "Email này đã được đăng ký.";
  }
  if (/email rate limit|over_email_send_rate_limit|for security purposes/i.test(raw)) {
    return "Thao tác quá nhanh, vui lòng đợi một lát rồi thử lại.";
  }
  if (
    /failed to fetch|fetch failed|networkerror|network request failed|load failed|econnrefused|econnreset|enotfound/i.test(
      raw,
    )
  ) {
    return "Lỗi kết nối mạng, vui lòng kiểm tra lại rồi thử.";
  }
  if (/timed? ?out|timeout/i.test(raw)) {
    return "Kết nối quá chậm, vui lòng thử lại.";
  }
  return null;
}

/**
 * Convert any thrown error into a message a non-technical user can read.
 * Hand-written messages are already Vietnamese (they contain diacritics)
 * and pass through unchanged; raw English errors from the database,
 * Supabase Auth, or the network are translated — unknown ones become a
 * generic fallback instead of leaking jargon to the UI.
 * Accepts Error, string, or error-shaped objects (e.g. PostgrestError).
 */
export function friendlyErrorMessage(err: unknown): string {
  const raw = rawMessageOf(err);
  if (!raw) return FALLBACK_ERROR_MESSAGE;
  if (VIETNAMESE_CHAR.test(raw)) return raw;
  return translateRawError(raw) ?? FALLBACK_ERROR_MESSAGE;
}
