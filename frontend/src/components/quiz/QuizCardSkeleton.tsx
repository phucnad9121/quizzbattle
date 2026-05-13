import { Skeleton } from "@/components/ui/skeleton"

export function QuizCardSkeleton() {
  return (
    <div className="rounded-2xl md:rounded-[2rem] bg-white/5 border border-white/10 overflow-hidden">
      {/* Cover Image Skeleton */}
      <Skeleton className="h-28 md:h-48 w-full rounded-none" />
      
      <div className="p-3 md:p-6 space-y-3 md:space-y-4">
        {/* Title Skeleton */}
        <Skeleton className="h-4 md:h-6 w-3/4 rounded-lg" />
        
        {/* Description Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-3 md:h-4 w-full rounded-md" />
          <Skeleton className="h-3 md:h-4 w-2/3 rounded-md" />
        </div>

        {/* Footer Skeleton */}
        <div className="flex items-center justify-between pt-3 md:pt-5 border-t border-white/5">
          <Skeleton className="h-6 md:h-8 w-20 md:w-24 rounded-lg" />
          <Skeleton className="h-4 w-12 md:w-16 rounded-md hidden sm:block" />
        </div>
      </div>
    </div>
  )
}
