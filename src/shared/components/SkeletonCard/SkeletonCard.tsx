export function SkeletonCard() {
  return (
    <div className="bg-white rounded-[16px] p-4 border border-gray-50 shadow-sm animate-pulse space-y-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-100 rounded-full" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-1/4" />
        </div>
        <div className="w-16 h-6 bg-gray-100 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="h-3 bg-gray-100 rounded w-12" />
          <div className="h-3 bg-gray-100 rounded w-12" />
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full w-full" />
      </div>
    </div>
  );
}
