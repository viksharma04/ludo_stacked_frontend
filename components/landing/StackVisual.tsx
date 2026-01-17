export function StackVisual() {
  return (
    <div className="flex items-end justify-center gap-8 py-8">
      {/* Single piece */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-red-500 border-2 border-red-600 shadow-lg" />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">Height: 1</span>
      </div>

      {/* Stack of 2 */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-blue-400 border-2 border-blue-500 shadow-lg absolute -top-3 left-0" />
          <div className="w-10 h-10 rounded-full bg-blue-500 border-2 border-blue-600 shadow-lg relative z-10" />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Height: 2</span>
      </div>

      {/* Stack of 3 */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-green-300 border-2 border-green-400 shadow-lg absolute -top-6 left-0" />
          <div className="w-10 h-10 rounded-full bg-green-400 border-2 border-green-500 shadow-lg absolute -top-3 left-0" />
          <div className="w-10 h-10 rounded-full bg-green-500 border-2 border-green-600 shadow-lg relative z-10" />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-4">Height: 3</span>
      </div>
    </div>
  )
}
