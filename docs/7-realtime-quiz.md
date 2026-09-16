# Realtime Quiz (Kahoot-like)

Kiến trúc quiz realtime: giáo viên tạo đề, mở phòng bằng mã PIN, học sinh
vào chơi bằng trình duyệt — không cần tài khoản. Điểm được tổng hợp tại
trình duyệt của giáo viên (host-as-server) và chỉ ghi DB **một lần** khi
kết thúc, nên không tốn quota Realtime/DB của Supabase Free Tier.

## 1. Database schema & RLS

Migration: `supabase/migrations/0013_quiz_realtime.sql`

| Bảng | Vai trò |
|---|---|
| `quizzes` | Đề quiz (`teacherId`, `title`, `description`) |
| `quizQuestions` | Câu hỏi (`quizId`, `orderIndex`, `options` jsonb 2–6 đáp án, `correctIndex`, `timeLimit` giây) |
| `quizSessions` | Phòng chơi (`pinCode` 6 số, `status`, `hostPublicKey`, `currentQuestionIndex`, `questionEndsAt`, `closedAt`) |
| `quizSessionResults` | Bảng điểm cuối (`sessionId`, `playerId`, `playerName`, `totalScore`, `correctCount`) — unique `(sessionId, playerId)` |

**RLS (strict):**
- `quizzes`, `quizQuestions`: giáo viên chỉ CRUD dữ liệu có `teacherId = auth.uid()`.
- `quizSessions`: giáo viên quản lý session của quiz mình sở hữu. **Không có policy cho `anon`** — học sinh không đọc/ghi bảng này trực tiếp.
- `quizSessionResults`: chỉ giáo viên (select/insert/delete). Không có update — kết quả immutable. Học sinh **không** insert; host client batch-insert cuối game.
- Partial unique index `quizSessions_active_pin_idx`: chỉ một phòng `waiting`/`playing` tồn tại trên mỗi PIN.

**RPCs (`SECURITY DEFINER`, `search_path=''`, chỉ expose field an toàn):**
- `join_quiz_session(p_pin)` → `{sessionId, status, quizTitle, questionCount, hostPublicKey, currentQuestionIndex}` hoặc `null`. Từ chối session `finished`, đã `closedAt`, hoặc cũ hơn 24h.
- `get_quiz_session_state(p_session_id)` → giống trên + `question` hiện tại (**không có `correctIndex`**) để player rejoin giữa chừng.
- `revoke ... from public` rồi `grant execute` chỉ cho `anon, authenticated`.

## 2. Realtime strategy

- **Channel:** `quiz-room-{sessionId}` (public channel — không bật `private`, nên không cần bảng authorization của Realtime).
- **Presence:** host track `{role:'host'}` với key `host`; mỗi player track `{name}` với key = `playerId`. Dùng để biết ai đang online.
- **Broadcast:** toàn bộ gameplay (hello/question/answer/reveal/end). Không ghi DB cho từng câu trả lời.
- **Scoring:** host giữ `Map<playerId, {score, correctCount, publicKey}>` trong memory. Điểm kiểu Kahoot: đúng = `500 + round(500 * remainingMs / timeLimitMs)`. Answer đến sau `endsAt + 2000ms` grace hoặc trùng lần trả lời bị bỏ qua.

### Local dev

Stack self-hosted gốc không có Realtime → `docker-compose.yaml` đã thêm
service `realtime` (`supabase/realtime:v2.102.3`, `SEED_SELF_HOST=true`)
và Kong route `/realtime/v1/` → `realtime:4000/socket`. Cần env
`SECRET_KEY_BASE` (>=64 ký tự, `openssl rand -hex 32`). Production
(Supabase cloud) đã có sẵn Realtime, không cần gì thêm.

## 3. Security & lifecycle

### Chống spoof bằng chữ ký ECDSA P-256 (`src/lib/quiz/crypto.ts`)

Broadcast là client-to-client — server không kiểm chứng payload, nên mọi
client đều có thể gửi bất kỳ event nào. Thay vì token dùng chung (lộ ngay
trong payload đầu tiên), ta ký từng message:

- **Host:** khi mở phòng, host component sinh keypair WebCrypto, lưu
  `hostPublicKey` (JWK) lên `quizSessions` (chỉ giáo viên ghi được qua RLS).
  Player nhận public key qua RPC. Mọi message host (`question`, `reveal`,
  `end`, `host-hello`, `reject`) đều kèm `sig` = ECDSA/SHA-256 trên
  canonical JSON (key sort đệ quy, bỏ field `sig`). Player verify trước khi
  tin message → **không ai giả lệnh host được** (không có private key).
- **Player:** mỗi player cũng sinh keypair; `player-hello` mang public key
  (tự ký — chứng minh sở hữu). Host bind `playerId → publicKey` theo kiểu
  first-seen. Mọi `answer` phải có chữ ký khớp binding → **không trả lời
  thay người khác được**.
- Nếu `playerId` đã bind với key khác, host gửi `reject {playerId,
  attemptId}` — `attemptId` ngẫu nhiên nên reject chỉ tác động đúng kẻ giả
  mạo; player thật không bị ảnh hưởng. Client bị reject tự tạo playerId +
  keypair mới rồi hello lại.
- Verify thất bại → player refetch `get_quiz_session_state` một lần để lấy
  `hostPublicKey` mới (host refresh sẽ đổi keypair) rồi thử lại.

> **Giới hạn:** `crypto.subtle` chỉ có trong secure context (HTTPS hoặc
> localhost). Khi chạy LAN `http://<ip>:3000`, cả hai phía tự degrade sang
> không ký (log `console.warn`). Muốn có anti-spoof thật ở lớp học → chạy
> qua HTTPS/Vercel.

### Vòng đời phòng

```
(teacher) createQuizSession  → status='waiting', PIN 6 số
(teacher) /quizzes/host/[id] → sinh keypair, ghi hostPublicKey, subscribe channel, bắt đầu đếm ngược timeout
(teacher) Bắt đầu           → advanceQuizQuestion(0) → status='playing', broadcast question
(teacher) Câu cuối / bấm Kết thúc / hết timeout → finishQuizSession → batch insert results + status='finished' + closedAt + removeChannel
```

**Auto-close:** `NEXT_PUBLIC_QUIZ_TIMEOUT_MINUTES` (mặc định 60). Host
component chạy deadline countdown; hết giờ → broadcast `end` + finish
session. Rời trang giữa chừng → cleanup deferred 300ms gọi finish (delay
để StrictMode remount ở dev huỷ được, không giết phòng oan). Đóng tab đột
ngột không chạy được cleanup → RPC backstop từ chối session cũ hơn 24h và
`closedAt is null` cũng chặn rejoin vào phòng đã kết thúc.

**Pre-check:** player luôn query `get_quiz_session_state` trước khi
subscribe — status không `waiting`/`playing` → màn hình "phòng đã đóng",
không mở websocket.

## 4. Reconnection

- Identity lưu ở `sessionStorage["quiz-player-{sessionId}"]`:
  `{playerId, name, privateKeyJwk, publicKeyJwk}`.
- Refresh / rớt mạng → mount lại đọc lại identity + keypair → giữ nguyên
  `playerId`, điểm số host đang giữ không mất.
- Sau reconnect, `get_quiz_session_state` trả về câu hỏi đang chiếu (nếu
  `playing`) → player resume đúng câu, đúng `endsAt`.
- Host nhận lại `player-hello` với cùng `playerId` + cùng key → chỉ cập
  nhật tên, giữ nguyên điểm. Key khác → `reject` (chống chiếm playerId).
- Mọi subscription đều `supabase.removeChannel(channel)` trong cleanup
  của `useEffect`.

## 5. Broadcast event payloads

Tất cả payload kèm `sig` (string, base64) khi crypto khả dụng.

| Event | Hướng | Payload |
|---|---|---|
| `host-hello` | host→all | `{sessionId}` — host vừa subscribe; player gửi lại `player-hello` |
| `player-hello` | player→host | `{playerId, name, publicKey(JWK), attemptId}` |
| `reject` | host→player | `{playerId, attemptId, reason}` |
| `question` | host→all | `{index, text, options[], timeLimit, endsAt, totalQuestions}` — **không** `correctIndex` |
| `answer` | player→host | `{playerId, questionIndex, choiceIndex}` |
| `reveal` | host→all | `{index, correctIndex, counts[], leaderboard(top10)}` |
| `end` | host→all | `{leaderboard}` |

## 6. Files

| Đường dẫn | Vai trò |
|---|---|
| `supabase/migrations/0013_quiz_realtime.sql` | Schema + RLS + RPCs |
| `src/lib/quiz/crypto.ts` | ECDSA sign/verify, canonical JSON |
| `src/lib/quiz/player-identity.ts` | sessionStorage identity |
| `src/lib/actions/quiz.ts` | Server Actions (CRUD, session lifecycle, join/state RPCs) |
| `src/hooks/quizzes.ts` | React Query hooks |
| `src/components/quiz/` | `QuizList`, `QuizEditor`, `HostRoom` |
| `src/components/play/` | `JoinQuizForm`, `PlayerScreen` |
| `src/app/quizzes/*`, `src/app/play/*` | Routes (`/play` đã thêm vào `PUBLIC_PATHS`) |
| `docker-compose.yaml`, `supabase/kong.yml` | Realtime service + route |
