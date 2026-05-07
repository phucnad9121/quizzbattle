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