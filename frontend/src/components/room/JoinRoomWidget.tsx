"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Zap, ArrowRight, ShieldAlert } from "lucide-react";
import { AxiosError } from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function JoinRoomWidget() {
  const router = useRouter();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (code.length !== 6) return;

    setIsLoading(true);
    try {
      const response = await apiClient.get(`/rooms/${code}`);
      if (response.status === 200) {
        router.push(`/room/${code}/lobby`);
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ detail: string }>;
      if (axiosError.response?.status === 404) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Phòng không tồn tại",
        });
      } else if (axiosError.response?.status === 410) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Phòng này đã kết thúc",
        });
      } else if (axiosError.response?.status === 403 && axiosError.response?.data?.detail === "BANNED_FROM_ROOM") {
        setIsBanned(true);
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: axiosError.response?.data?.detail || "Đã có lỗi xảy ra",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCode(val);
  };

  return (
    <div className="relative group w-full max-w-[320px] md:max-w-[400px]">
      {/* Animated Glow effect */}
      <div className="absolute inset-0 bg-linear-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-[100px] group-hover:bg-indigo-500/30 transition-all rounded-[3.5rem] animate-pulse" />
      
      <div className="relative p-[1px] rounded-[3.5rem] bg-linear-to-r from-white/10 via-white/20 to-white/10 group-hover:from-indigo-500 group-hover:via-purple-500 group-hover:to-pink-500 transition-all duration-500">
        <form 
          onSubmit={handleJoin}
          className="relative bg-slate-950/90 backdrop-blur-3xl rounded-[3.5rem] p-9 md:p-11 flex flex-col gap-9 shadow-2xl overflow-hidden group/form"
        >
          {/* Top decorative line */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50 group-hover/form:opacity-100 transition-opacity" />

          <div className="flex flex-col items-center gap-5">
             <div className="p-5 bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-[2rem] shadow-xl shadow-purple-500/30 rotate-6 group-hover/form:rotate-12 group-hover/form:scale-110 transition-all duration-500">
                <Zap size={36} className="text-white fill-white" />
             </div>
             <div className="text-center space-y-2">
                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-linear-to-r from-white via-white to-indigo-300">
                  Vào trận
                </h3>
                <p className="text-[10px] text-indigo-400/60 font-black uppercase tracking-[0.4em]">Đấu trường đang chờ</p>
             </div>
          </div>
          
          <div className="flex flex-col gap-9">
            <div className="flex flex-col gap-7">
              <div className="relative group/input">
                <div className="absolute -inset-1 bg-linear-to-r from-indigo-500 to-purple-500 rounded-[2rem] blur-xs opacity-0 group-focus-within/input:opacity-30 transition-opacity" />
                <Input
                  type="text"
                  placeholder="ABC 123"
                  value={code}
                  onChange={handleInputChange}
                  className="relative h-22 text-center text-5xl font-mono font-black tracking-[0.3em] bg-white/5 border-white/10 text-white placeholder:text-white/5 focus-visible:ring-indigo-500/50 rounded-[2rem] transition-all shadow-inner border-2"
                  maxLength={6}
                />
              </div>

              <div className="flex justify-center gap-4">
                 {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-4 h-4 rounded-full transition-all duration-500 ${
                        i < code.length 
                          ? 'bg-linear-to-r from-indigo-400 to-purple-500 shadow-[0_0_20px_rgba(168,85,247,1)] scale-125' 
                          : 'bg-white/10'
                      }`} 
                    />
                 ))}
              </div>
              
              <Button
                type="submit"
                disabled={code.length !== 6 || isLoading}
                className={`h-22 w-full rounded-[2.5rem] transition-all duration-500 active:scale-[0.98] flex items-center justify-center gap-5 font-black uppercase italic tracking-[0.2em] text-xl ${
                  code.length === 6 
                    ? 'bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-[0_20px_50px_rgba(192,38,211,0.4)] hover:shadow-[0_25px_60px_rgba(192,38,211,0.6)] hover:scale-[1.03]' 
                    : 'bg-white/5 text-white/20 border border-white/5'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={32} />
                ) : (
                  <>
                    Chiến ngay
                    <ArrowRight size={32} className={code.length === 6 ? 'animate-bounce-x' : ''} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Banned Modal */}
      <Dialog open={isBanned} onOpenChange={setIsBanned}>
        <DialogContent className="bg-[#020617] border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.2)] rounded-[2.5rem] p-8 md:p-12 text-center max-w-md">
          <DialogHeader>
            <div className="mx-auto w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mb-6 border border-amber-500/20">
              <ShieldAlert className="text-amber-500" size={40} />
            </div>
            <DialogTitle className="text-3xl font-black italic uppercase text-white mb-2 leading-tight">
              Truy cập bị từ chối
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-zinc-400 text-lg leading-relaxed">
              Bạn đã bị chủ phòng mời rời phòng nên không thể truy cập lại.
            </p>
          </div>
          <DialogFooter className="mt-6 flex justify-center sm:justify-center">
            <Button 
              onClick={() => setIsBanned(false)}
              className="h-16 px-12 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
            >
              Tôi đã hiểu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
