"use client";

import { useState, useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, ChevronDown, ChevronUp, User, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatPanelProps {
  sendMessage: (type: string, payload: any) => void;
  isWidget?: boolean;
}

export default function ChatPanel({ sendMessage, isWidget = false }: ChatPanelProps) {
  const { messages, hostId } = useGameStore();
  const { user } = useAuthStore();
  const [inputText, setInputText] = useState("");
  const [isOpen, setIsOpen] = useState(isWidget);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage("CHAT_MESSAGE", { text: inputText.trim() });
    setInputText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className={isWidget ? "w-full h-full flex flex-col" : "fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"}>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={isWidget ? undefined : { opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={isWidget ? undefined : { opacity: 0, y: 20, scale: 0.95 }}
            className={`
              ${isWidget ? "w-full h-full" : "w-80 md:w-96 h-[450px] shadow-2xl"} 
              bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden
            `}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-indigo-600/20">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-indigo-400" size={18} />
                <span className="font-bold text-white tracking-wide">Trò chuyện</span>
                <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {messages.length}
                </span>
              </div>
              {!isWidget && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/10 text-white/50 hover:text-white"
                >
                  <ChevronDown size={18} />
                </Button>
              )}
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent min-h-[200px]"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-2 py-8">
                  <MessageSquare size={32} strokeWidth={1} />
                  <p className="text-xs">Chưa có tin nhắn nào</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.user_id === user?.id;
                  const isHost = msg.user_id === hostId;
                  return (
                    <div 
                      key={idx} 
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div className={`flex items-center gap-1.5 mb-1 px-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        <span className={`text-[10px] font-bold ${isMe ? "text-indigo-400" : isHost ? "text-amber-400" : "text-white/50"}`}>
                          {msg.username}
                        </span>
                        {isHost && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-black uppercase tracking-tighter">
                            <Crown size={8} className="fill-amber-500" />
                            Host
                          </span>
                        )}
                        <span className="text-[9px] text-white/30">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className={`
                        max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                        ${isMe 
                          ? "bg-indigo-600 text-white rounded-tr-none shadow-[0_5px_15px_rgba(79,70,229,0.2)]" 
                          : isHost
                          ? "bg-indigo-500/20 text-white rounded-tl-none border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                          : "bg-white/10 text-white/90 rounded-tl-none border border-white/5"
                        }
                      `}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-white/10 bg-black/20">
              <div className="flex items-center gap-2">
                <Input 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Nhập tin nhắn..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-indigo-500 rounded-xl h-10"
                  maxLength={200}
                />
                <Button 
                  size="icon"
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 shrink-0"
                >
                  <Send size={18} />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isWidget && (
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-14 h-14 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95
            ${isOpen ? "bg-white/10 hover:bg-white/20" : "bg-indigo-600 hover:bg-indigo-500"}
          `}
        >
          {isOpen ? <ChevronUp size={24} /> : <MessageSquare size={24} />}
        </Button>
      )}
    </div>
  );
}
