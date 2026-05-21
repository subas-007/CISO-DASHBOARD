export default function PageSkeleton() {
  return (
    <div className="flex h-screen w-full bg-[#0a0f1e] animate-pulse">
      <div className="w-16 h-full bg-[#0d1324] border-r border-white/[0.06] flex flex-col gap-4 p-3 pt-6">
        <div className="h-8 w-8 rounded-lg bg-white/[0.06] mx-auto" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-8 w-8 rounded-lg bg-white/[0.04] mx-auto" />
        ))}
      </div>
      <div className="flex-1 p-6 space-y-6 overflow-hidden">
        <div className="h-12 w-full rounded-xl bg-white/[0.04]" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-white/[0.04]" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 h-64 rounded-xl bg-white/[0.04]" />
          <div className="h-64 rounded-xl bg-white/[0.04]" />
        </div>
        <div className="h-48 w-full rounded-xl bg-white/[0.04]" />
      </div>
    </div>
  )
}
