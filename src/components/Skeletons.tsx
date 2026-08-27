export function MemberGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-glow p-6">
          <div className="h-2 -mx-6 -mt-6 mb-5 rounded-t-2xl bg-white/10" />
          <div className="flex items-start justify-between mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 animate-pulse" />
            <div className="w-24 h-7 rounded-full bg-white/5 animate-pulse" />
          </div>
          <div className="h-5 w-32 bg-white/5 rounded animate-pulse mb-2" />
          <div className="h-4 w-20 bg-white/5 rounded animate-pulse mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="h-14 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function TournamentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-glow p-5 animate-pulse">
          <div className="h-5 w-40 bg-white/5 rounded mb-3" />
          <div className="h-4 w-56 bg-white/5 rounded" />
        </div>
      ))}
    </div>
  )
}

export function TopListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-white/10" />
          <div className="h-4 w-40 bg-white/10 rounded" />
          <div className="ml-auto h-4 w-16 bg-white/10 rounded" />
        </div>
      ))}
    </div>
  )
}
