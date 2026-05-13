"use client";

import { ConnectionStatus } from "@/types/game";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface ConnectionBannerProps {
  status: ConnectionStatus;
}

export default function ConnectionBanner({ status }: ConnectionBannerProps) {
  if (status === "connected" || status === "connecting" && typeof window !== 'undefined') {
    return null;
  }

  return (
    <AnimatePresence>
      {(status === "reconnecting" || status === "disconnected" || status === "failed") && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] flex justify-center p-4"
        >
          <div className={`
            flex items-center gap-4 px-6 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl
            ${status === "failed" 
              ? "bg-rose-500/20 border-rose-500/30 text-rose-500" 
              : "bg-amber-500/20 border-amber-500/30 text-amber-500"}
          `}>
            {status === "failed" ? (
              <AlertCircle className="h-5 w-5 animate-pulse" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase tracking-widest italic">
                {status === "failed" ? "Mất kết nối hoàn toàn" : "Đang kết nối lại..."}
              </span>
              <span className="text-[10px] font-bold opacity-80">
                {status === "failed" 
                  ? "Vui lòng reload lại trình duyệt để tiếp tục" 
                  : "Đang thử khôi phục phiên chơi của bạn"}
              </span>
            </div>

            {status === "failed" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.location.reload()}
                className="ml-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 rounded-xl"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
