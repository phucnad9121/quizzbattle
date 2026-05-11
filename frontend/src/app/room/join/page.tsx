"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap, ArrowLeft } from "lucide-react";
import { AxiosError } from "axios";

function JoinRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode) {
      setCode(urlCode.toUpperCase().slice(0, 6));
    }
  }, [searchParams]);

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
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: axiosError.response?.data?.detail || "Đã có lỗi xảy ra, vui lòng thử lại.",
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
    <div className="flex flex-1 items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black overflow-hidden relative min-h-screen">
      {/* Fixed Back Button */}
      <div className="absolute top-6 left-6 z-50">
        <Button 
          variant="ghost" 
          onClick={() => router.push("/dashboard")}
          className="bg-white/5 hover:bg-white/10 text-white rounded-2xl px-4 py-6 border border-white/10 backdrop-blur-md transition-all group"
        >
          <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
          Quay lại
        </Button>
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse [animation-delay:1s]" />
      </div>

      <Card className="w-full max-w-md border-white/10 bg-black/40 backdrop-blur-xl shadow-[0_0_50px_rgba(79,70,229,0.2)] relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <CardHeader className="space-y-1 text-center pt-8">
          <div className="mx-auto bg-indigo-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30 rotate-3 group-hover:rotate-6 transition-transform duration-300">
            <Zap className="text-white fill-white" size={28} />
          </div>
          <CardTitle className="text-4xl font-black tracking-tight text-white uppercase italic">
            VÀO PHÒNG
          </CardTitle>
          <CardDescription className="text-zinc-400 text-lg font-medium">
            Nhập mã 6 ký tự để tham gia trận đấu
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-10 pt-4">
          <form onSubmit={handleJoin} className="space-y-8">
            <div className="relative">
              <Input
                type="text"
                placeholder="ABC123"
                value={code}
                onChange={handleInputChange}
                className="h-20 text-center text-4xl font-mono tracking-[0.4em] font-black bg-white/5 border-2 border-white/10 text-white placeholder:text-zinc-800 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 transition-all uppercase rounded-2xl"
                maxLength={6}
                autoFocus
              />
              <div className="mt-2 flex justify-center gap-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-8 rounded-full transition-all duration-300 ${i < code.length ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'bg-white/10'
                      }`}
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-16 text-xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-500/20 border-none transition-all active:scale-[0.97] rounded-2xl hover:shadow-indigo-500/40"
              disabled={code.length !== 6 || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  ĐANG KIỂM TRA...
                </>
              ) : (
                "THAM GIA NGAY"
              )}
            </Button>

            <div className="text-center space-y-2">
              <p className="text-zinc-500 text-sm font-medium">
                Bạn chưa có mã? Hãy hỏi chủ phòng để lấy mã tham gia.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    }>
      <JoinRoomContent />
    </Suspense>
  );
}
