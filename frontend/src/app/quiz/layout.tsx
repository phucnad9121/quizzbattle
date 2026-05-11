import type { ReactNode } from "react";
import { Navbar } from "@/components/shared/Navbar";

export default function QuizLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#020617]">
      <Navbar />
      <main className="w-full">{children}</main>
    </div>

  );
}
