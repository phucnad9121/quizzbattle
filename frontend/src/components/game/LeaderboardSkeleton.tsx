import { Skeleton } from "@/components/ui/skeleton"
import { Trophy } from "lucide-react"

export function LeaderboardSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-8 w-48 rounded-lg" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 md:p-5 rounded-[1.5rem] border border-white/5 bg-white/5"
          >
            <div className="flex items-center gap-5">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-32 md:w-40 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md md:hidden" />
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-7 w-16 md:w-24 rounded-md" />
              <Skeleton className="h-3 w-8 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
