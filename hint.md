backend/
├── Dockerfile
├── alembic.ini
├── pyproject.toml
│
├── alembic/
│   ├── env.py
│   └── versions/
│       └── 001_initial_schema.py
│
└── app/
    ├── main.py                  # FastAPI app factory, lifespan
    │
    ├── core/                    # ── Tầng DOMAIN (không phụ thuộc gì)
    │   ├── config.py            #    Settings (pydantic-settings)
    │   ├── security.py          #    JWT encode/decode, password hash
    │   ├── exceptions.py        #    Custom domain exceptions
    │   └── constants.py         #    Enums, magic numbers
    │
    ├── domain/                  # ── Entity & business rule
    │   ├── user.py              #    User entity
    │   ├── quiz.py              #    Quiz, Question entities
    │   └── game.py              #    GameSession, GamePlayer entities
    │
    ├── repositories/            # ── Tầng DATA (chỉ nói chuyện với DB/Redis)
    │   ├── base.py              #    Generic async repo
    │   ├── user_repo.py
    │   ├── quiz_repo.py
    │   ├── game_repo.py
    │   └── redis_repo.py        #    Room state, leaderboard, pub/sub
    │
    ├── services/                # ── Tầng USE CASE (business logic)
    │   ├── auth_service.py      #    Register, login, refresh token
    │   ├── quiz_service.py      #    CRUD quiz & questions
    │   ├── room_service.py      #    Tạo phòng, join, start game
    │   ├── game_service.py      #    Xử lý gameplay, chấm điểm
    │   └── leaderboard_service.py
    │
    ├── api/                     # ── Tầng INTERFACE (HTTP + WS)
    │   ├── deps.py              #    Dependency injection (get_db, get_current_user)
    │   └── v1/
    │       ├── router.py        #    Include all routers
    │       ├── auth.py          #    POST /auth/register, /login, /refresh, /logout
    │       ├── users.py         #    GET /users/me, PATCH /users/me
    │       ├── quizzes.py       #    CRUD /quizzes
    │       ├── questions.py     #    CRUD /quizzes/{id}/questions
    │       ├── rooms.py         #    POST /rooms, GET /rooms/{code}
    │       └── ws.py            #    WebSocket /ws/{room_code}
    │
    ├── schemas/                 # ── Pydantic I/O schemas
    │   ├── auth.py
    │   ├── user.py
    │   ├── quiz.py
    │   ├── question.py
    │   ├── room.py
    │   └── ws_messages.py       #    WS event payload schemas
    │
    ├── db/
    │   ├── session.py           #    Async engine, SessionLocal
    │   └── models/
    │       ├── base.py          #    DeclarativeBase + TimestampMixin
    │       ├── user.py
    │       ├── quiz.py
    │       ├── question.py
    │       └── game.py
    │
    └── infrastructure/
        ├── redis_client.py      #    aioredis pool singleton
        └── connection_manager.py #   WebSocket connection map per room


frontend/
├── Dockerfile
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
│
├── public/
│   ├── sounds/                  # Bonus: sfx files
│   └── icons/
│
└── src/
    ├── app/                     # ── Next.js App Router pages
    │   ├── layout.tsx            #    Root layout (ThemeProvider, QueryProvider)
    │   ├── page.tsx              #    Landing / Home
    │   │
    │   ├── (auth)/               #    Route group — không có layout chung
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   │
    │   ├── dashboard/
    │   │   ├── layout.tsx        #    Sidebar, Navbar
    │   │   └── page.tsx          #    Danh sách quiz của user
    │   │
    │   ├── quiz/
    │   │   ├── create/page.tsx
    │   │   └── [quizId]/
    │   │       ├── edit/page.tsx
    │   │       └── questions/page.tsx
    │   │
    │   ├── room/
    │   │   ├── create/page.tsx   #    Host tạo phòng → nhận room_code
    │   │   ├── join/page.tsx     #    Nhập mã 6 ký tự
    │   │   └── [roomCode]/
    │   │       ├── lobby/page.tsx  #  Phòng chờ
    │   │       └── game/page.tsx   #  Màn chơi realtime
    │   │
    │   └── results/[sessionId]/page.tsx
    │
    ├── components/
    │   ├── ui/                   #    shadcn/ui primitives (Button, Card, Dialog…)
    │   ├── auth/
    │   │   ├── LoginForm.tsx
    │   │   └── RegisterForm.tsx
    │   ├── quiz/
    │   │   ├── QuizCard.tsx
    │   │   ├── QuizEditor.tsx
    │   │   └── QuestionForm.tsx
    │   ├── room/
    │   │   ├── PlayerList.tsx    #    Danh sách người chờ
    │   │   └── RoomCode.tsx
    │   ├── game/
    │   │   ├── QuestionDisplay.tsx
    │   │   ├── AnswerButtons.tsx
    │   │   ├── CountdownTimer.tsx
    │   │   ├── ResultOverlay.tsx
    │   │   ├── Leaderboard.tsx
    │   │   └── ChatPanel.tsx     #    Bonus
    │   └── shared/
    │       ├── Navbar.tsx
    │       └── LoadingSpinner.tsx
    │
    ├── hooks/
    │   ├── useAuth.ts            #    Zustand auth store wrapper
    │   ├── useWebSocket.ts       #    WS connection + event dispatcher
    │   ├── useGameState.ts       #    Zustand game state
    │   └── useCountdown.ts
    │
    ├── lib/
    │   ├── api.ts                #    Axios instance + interceptors (token refresh)
    │   ├── ws-events.ts          #    WS event type constants & parsers
    │   └── utils.ts
    │
    ├── store/
    │   ├── authStore.ts          #    Zustand: user, tokens
    │   └── gameStore.ts          #    Zustand: question, scores, leaderboard
    │
    └── types/
        ├── auth.ts
        ├── quiz.ts
        └── game.ts


-- ════════════════════════════════════════
--  USERS
-- ════════════════════════════════════════
CREATE TABLE users (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50)  NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    hashed_password TEXT         NOT NULL,
    avatar_url      TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Refresh tokens (blacklist / rotation)
CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ════════════════════════════════════════
--  QUIZZES
-- ════════════════════════════════════════
CREATE TABLE quizzes (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        VARCHAR(200) NOT NULL,
    description  TEXT,
    cover_url    TEXT,
    is_public    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_quizzes_owner  ON quizzes(owner_id);
CREATE INDEX idx_quizzes_public ON quizzes(is_public) WHERE is_public = TRUE;

-- ════════════════════════════════════════
--  QUESTIONS
-- ════════════════════════════════════════
-- [W-02] question_type dùng VARCHAR thay ENUM để Alembic autogenerate hoạt động đúng.
-- [M-02] Thêm updated_at để audit khi host sửa câu hỏi sau khi tạo quiz.
-- [M-01] Thêm CHECK constraints để bảo vệ business rules ở tầng DB.
CREATE TABLE questions (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id         UUID         NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text   TEXT         NOT NULL,
    question_type   VARCHAR(20)  NOT NULL DEFAULT 'multiple_choice',  -- 'multiple_choice' | 'true_false'
    time_limit_secs SMALLINT     NOT NULL DEFAULT 30,
    points          SMALLINT     NOT NULL DEFAULT 100,
    order_index     SMALLINT     NOT NULL DEFAULT 0,
    image_url       TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_question_type    CHECK (question_type IN ('multiple_choice', 'true_false')),
    CONSTRAINT chk_time_limit       CHECK (time_limit_secs BETWEEN 5 AND 120),
    CONSTRAINT chk_points           CHECK (points > 0),
    CONSTRAINT chk_order_index      CHECK (order_index >= 0)
);
CREATE INDEX idx_questions_quiz ON questions(quiz_id, order_index);

-- Lựa chọn đáp án (options)
CREATE TABLE answer_options (
    id          UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID     NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT     NOT NULL,
    is_correct  BOOLEAN  NOT NULL DEFAULT FALSE,
    order_index SMALLINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_option_order CHECK (order_index >= 0)
);
CREATE INDEX idx_options_question ON answer_options(question_id);

-- ════════════════════════════════════════
--  GAME SESSIONS
-- ════════════════════════════════════════
-- [C-01] room_code dùng VARCHAR(6) thay CHAR(6) — CHAR pad spaces, asyncpg trả
--        về chuỗi có trailing spaces gây bug khi so sánh với input từ user.
-- [C-02] Bỏ UNIQUE inline, chỉ dùng named index để tránh tạo 2 unique indexes
--        trùng nhau trên cùng column.
-- [W-02] status dùng VARCHAR thay ENUM.
-- [M-03] Thêm partial index cho active rooms — tối ưu query dọn dẹp & public lobby.
CREATE TABLE game_sessions (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id              UUID        NOT NULL REFERENCES quizzes(id),
    host_id              UUID        NOT NULL REFERENCES users(id),
    room_code            VARCHAR(6)  NOT NULL,              -- "AB12CD" — dùng VARCHAR, không phải CHAR
    status               VARCHAR(20) NOT NULL DEFAULT 'waiting',  -- 'waiting' | 'in_progress' | 'finished'
    current_question_idx SMALLINT    NOT NULL DEFAULT -1,  -- -1 = chưa bắt đầu
    started_at           TIMESTAMPTZ,
    finished_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_session_status CHECK (status IN ('waiting', 'in_progress', 'finished'))
);
CREATE UNIQUE INDEX idx_sessions_room_code ON game_sessions(room_code);      -- [C-02] chỉ 1 unique index
CREATE INDEX        idx_sessions_host      ON game_sessions(host_id);
-- [M-03] Partial index — chỉ index phòng đang active, tránh full scan khi query
CREATE INDEX        idx_sessions_active    ON game_sessions(status, created_at DESC)
    WHERE status IN ('waiting', 'in_progress');

-- ════════════════════════════════════════
--  GAME PARTICIPANTS (người chơi trong session)
-- ════════════════════════════════════════
-- [C-03] PostgreSQL coi NULL != NULL trong UNIQUE constraint nên UNIQUE(session_id, user_id)
--        không ngăn được nhiều guest (user_id = NULL) join cùng phòng.
--        Fix: dùng 2 partial unique indexes riêng biệt.
CREATE TABLE game_participants (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID        NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    user_id      UUID        REFERENCES users(id),  -- NULL nếu guest
    display_name VARCHAR(50) NOT NULL,
    total_score  INTEGER     NOT NULL DEFAULT 0,
    rank         SMALLINT,                          -- điền sau khi game kết thúc
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- Không dùng UNIQUE(session_id, user_id) — xem index bên dưới
);
CREATE INDEX        idx_participants_session     ON game_participants(session_id);
-- Registered user: mỗi user chỉ join 1 lần / session
CREATE UNIQUE INDEX idx_participants_user_session ON game_participants(session_id, user_id)
    WHERE user_id IS NOT NULL;
-- Guest: mỗi display_name là duy nhất trong session
CREATE UNIQUE INDEX idx_participants_guest_name   ON game_participants(session_id, display_name);

-- ════════════════════════════════════════
--  PLAYER ANSWERS (đáp án từng câu)
-- ════════════════════════════════════════
-- [W-03] score_earned đổi sang INTEGER cho nhất quán với total_score,
--        tránh overflow tiềm ẩn nếu có bonus multiplier sau này.
CREATE TABLE player_answers (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id  UUID        NOT NULL REFERENCES game_participants(id) ON DELETE CASCADE,
    question_id     UUID        NOT NULL REFERENCES questions(id),
    selected_option UUID        REFERENCES answer_options(id),  -- NULL nếu không trả lời
    is_correct      BOOLEAN     NOT NULL DEFAULT FALSE,
    score_earned    INTEGER     NOT NULL DEFAULT 0,             -- [W-03] INTEGER thay SMALLINT
    answer_time_ms  INTEGER     NOT NULL DEFAULT 0,
    answered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (participant_id, question_id)
);
CREATE INDEX idx_answers_participant ON player_answers(participant_id);
CREATE INDEX idx_answers_question    ON player_answers(question_id);