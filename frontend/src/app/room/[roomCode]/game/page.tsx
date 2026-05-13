"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useSound } from "@/hooks/useSound";
import CountdownTimer from "@/components/game/CountdownTimer";
import QuestionDisplay from "@/components/game/QuestionDisplay";
import AnswerButtons from "@/components/game/AnswerButtons";
import Leaderboard from "@/components/game/Leaderboard";
import ResultOverlay from "@/components/game/ResultOverlay";
import { Button } from "@/components/ui/button";
import ConnectionBanner from "@/components/game/ConnectionBanner";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api";
import { Loader2, ArrowLeft, Zap, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Howler } from "howler";

export default function GamePage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    currentQuestion,
    status,
    selectedOption,
    selectOption,
    answerResult,
    questionEnd,
    leaderboard,
    resetGame,
    hostId,
    quizId
  } = useGameStore();

  const { status: wsStatus, sendMessage } = useWebSocket(roomCode);
  const [transitionCountdown, setTransitionCountdown] = useState<number | null>(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const { playSound, isMuted, toggleMute: toggleMuteBase } = useSound();

  const toggleMute = () => {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume();
    }
    toggleMuteBase();
  };

  const isHost = user?.id === hostId;

  useEffect(() => {
    if (!roomCode) {
      router.push("/dashboard");
    }
  }, [roomCode, router]);

  useEffect(() => {
    const waitTime = questionEnd?.wait_time ?? null;
    if (waitTime !== null) {
      setTransitionCountdown(waitTime);

      // QB-058 & QB-059: Timing for results and leaderboard
      setShowResultOverlay(true);
      setShowLeaderboard(false);

      const resultTimer = setTimeout(() => {
        setShowResultOverlay(false);
        setShowLeaderboard(true);
      }, 3000);

      const timer = setInterval(() => {
        setTransitionCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => {
        clearInterval(timer);
        clearTimeout(resultTimer);
      };
    }
    setTransitionCountdown(null);
    setShowResultOverlay(false);
    setShowLeaderboard(false);
  }, [questionEnd]);

  // QB-066 & QB-067: Confetti and Sound on correct answer
  useEffect(() => {
    if (answerResult) {
      if (answerResult.is_correct) {
        playSound("correct");
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 100
        });
      } else {
        playSound("wrong");
      }
    }
  }, [answerResult, playSound]);

  // QB-066 & QB-067: Confetti and Fanfare on match finish (Top 3)
  useEffect(() => {
    if (status === "finished" && leaderboard.length > 0) {
      const myRank = leaderboard.findIndex(e => e.user_id === user?.id) + 1;

      if (myRank > 0 && myRank <= 3) {
        playSound("gameOver");
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

        return () => clearInterval(interval);
      }
    }
  }, [status, leaderboard, user?.id, playSound]);

  const handleSelectOption = (optionId: string) => {
    if (selectedOption || answerResult) return;

    selectOption(optionId);
    sendMessage({
      type: "SUBMIT_ANSWER",
      payload: {
        question_id: currentQuestion?.question_id,
        selected_option_id: optionId
      }
    });
  };

  const handleSkipQuestion = () => {
    sendMessage({ type: "SKIP_QUESTION" });
  };

  const handleLeave = () => {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume();
    }
    resetGame();
    router.push("/dashboard");
  };

  // Loading state
  if (!currentQuestion && status !== "finished") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
          <h2 className="text-2xl font-black italic uppercase tracking-widest animate-pulse">
            Đang chờ câu hỏi...
          </h2>
        </div>
      </div>
    );
  }

  // Game Over state
  if (status === "finished") {
    return (
      <div className="min-h-screen bg-[#020617] text-white p-6 overflow-y-auto relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse [animation-delay:3s]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-12 py-12">
          <div className="text-center space-y-4">
            <div className="inline-block px-4 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500">Match Finished</span>
            </div>
            <h1 className="text-7xl md:text-9xl font-black italic uppercase tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              KẾT THÚC
            </h1>
          </div>


          <Leaderboard entries={leaderboard} highlightUserId={user?.id} isFull />
          <div className="flex flex-col md:flex-row justify-center items-center gap-6 pt-8">
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                resetGame();
                router.push("/dashboard");
              }}
              className="h-16 px-8 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white font-black text-lg transition-all uppercase italic"
            >
              Dashboard
            </Button>

            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                router.push(`/results/${roomCode}`);
              }}
              className="h-16 px-8 rounded-2xl bg-white text-slate-950 hover:bg-zinc-200 font-black text-lg transition-all uppercase italic flex items-center gap-2 shadow-lg"
            >
              Xem chi tiết
            </Button>

            {isHost && (
              <Button
                size="lg"
                disabled={isRestarting}
                onClick={async () => {
                  if (!quizId) {
                    console.error("Missing quizId for restart");
                    return;
                  }
                  try {
                    setIsRestarting(true);
                    const response = await apiClient.post("/rooms", {
                      quiz_id: quizId
                    });
                    resetGame();
                    router.push(`/room/${response.data.room_code}/lobby`);
                  } catch (err) {
                    console.error("Failed to restart:", err);
                    setIsRestarting(false);
                  }
                }}
                className="h-16 px-16 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg shadow-[0_20px_40px_rgba(79,70,229,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center gap-3 disabled:opacity-70"
              >
                {isRestarting ? <Loader2 className="animate-spin" size={20} /> : <RotateCcw size={20} />}
                Chơi lại
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#020617] min-h-screen text-white relative overflow-hidden font-sans">
      <ConnectionBanner status={wsStatus} />
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse [animation-delay:3s]" />
      </div>

      {/* Header / Top Bar */}
      <div className="relative z-20 flex items-center justify-between p-4 md:p-8 bg-black/20 backdrop-blur-md border-b border-white/5">
        {/* Left: Exit */}
        <div className="flex-shrink-0">
          <Button
            variant="ghost"
            onClick={handleLeave}
            className="bg-white/5 hover:bg-white/10 text-white rounded-2xl px-4 py-6 border border-white/10 transition-all group"
          >
            <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
            Thoát
          </Button>
        </div>

        {/* Center: Countdown & Question Progress */}
        <div className="flex-1 max-w-4xl mx-auto flex items-center justify-center gap-6 px-4">
          <div className="flex items-center gap-3 shrink-0 py-2 px-4 bg-white/5 rounded-2xl border border-white/5">
            <button
              onClick={() => playSound('correct')}
              className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-lg font-black italic shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform"
              title="Test Sound"
            >
              {((currentQuestion?.question_idx ?? 0) + 1)}/{currentQuestion?.total_questions}
            </button>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter cursor-help" onClick={() => playSound('correct')}>Quizz Battle</span>
              <span className="text-sm font-black text-white italic uppercase tracking-tighter leading-tight">Live</span>
            </div>
          </div>

          <div className="flex-1 max-w-md">
            {answerResult || questionEnd ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-2 rounded-full flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.1)] h-12">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-sm font-black uppercase tracking-[0.2em] text-emerald-400">
                  {questionEnd
                    ? `Tiếp theo: ${transitionCountdown}s`
                    : "Đang chờ..."}
                </span>
              </div>
            ) : (
              <CountdownTimer
                key={currentQuestion?.question_id}
                totalSeconds={currentQuestion?.time_limit_secs || 20}
                className="shadow-none bg-transparent border-none p-0 max-w-none"
              />
            )}
          </div>
        </div>

        {/* Right: Controls & Code */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className={`w-12 h-12 rounded-2xl border transition-all ${isMuted
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </Button>

            {isHost && !answerResult && (
              <Button
                onClick={handleSkipQuestion}
                className="h-12 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black uppercase italic rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 px-4"
              >
                <Zap size={18} fill="currentColor" />
              </Button>
            )}
          </div>

          <div className="hidden lg:block">
            <div className="px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-right">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-1">Mã phòng</span>
              <span className="text-xl font-black font-mono text-indigo-400">{roomCode}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Question & Answers Area or Leaderboard */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto w-full gap-12 py-8">
        {showLeaderboard ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <Leaderboard entries={leaderboard} highlightUserId={user?.id} />
          </motion.div>
        ) : currentQuestion ? (
          <>
            <QuestionDisplay
              questionText={currentQuestion.question_text}
              currentIndex={currentQuestion.question_idx ?? 0}
              totalQuestions={currentQuestion.total_questions || 0}
            />

            <AnswerButtons
              options={currentQuestion.options}
              selectedId={selectedOption}
              correctId={questionEnd?.correct_option_id || (answerResult?.is_correct ? selectedOption : null)}
              disabled={!!selectedOption || !!answerResult || !!questionEnd}
              answerResult={answerResult}
              onSelect={handleSelectOption}
            />
          </>
        ) : null}
      </div>

      {/* Result Overlay */}
      <ResultOverlay
        isVisible={showResultOverlay}
        isCorrect={answerResult?.is_correct || false}
        scoreEarned={answerResult?.score_earned || 0}
        answerTimeMs={answerResult?.answer_time_ms || 0}
        correctAnswer={questionEnd?.correct_option_text}
      />

      {/* Footer Stats (Sticky Mobile) */}
      <div className="relative z-10 mt-auto md:mt-0 flex justify-center w-full pb-8">
        <div className="flex items-center gap-8 px-8 py-4 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Điểm số</span>
            <span className="text-2xl font-black text-indigo-400">
              {leaderboard.find(e => e.user_id === user?.id)?.score || 0}
            </span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Hạng</span>
            <span className="text-2xl font-black text-white italic">
              #{(leaderboard.findIndex(e => e.user_id === user?.id) + 1) || '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
