import { Skeleton } from "@/components/ui/skeleton"

export function PlayerListSkeleton() {
  return (
    <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div 
          key={i} 
          className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center gap-3 animate-pulse"
        >
          <Skeleton className="w-16 h-16 rounded-3xl" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
      ))}
    </div>
  )
}
