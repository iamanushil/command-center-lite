import type { Task, TaskCategory } from '../../types'
import { Card, Button } from '../ui'

interface SyncPriorityProps {
  selectedPriority: Task | null
  availableTasks: Task[]
  onSelectPriority: (task: Task) => void
  onClearPriority: () => void
  getCategoryColor: (category: TaskCategory) => string
}

export function SyncPriority({
  selectedPriority,
  availableTasks,
  onSelectPriority,
  onClearPriority,
  getCategoryColor,
}: SyncPriorityProps) {
  const displayTasks = availableTasks.slice(0, 3)

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-lg">⚡</span>
        <span className="font-mono text-xs uppercase tracking-wider text-overlay1">
          Main Priority
        </span>
      </div>

      {selectedPriority ? (
        /* Selected priority view */
        <div>
          <div
            className="bg-mantle rounded-xl p-5 border-l-4 border-yellow"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getCategoryColor(selectedPriority.category) }}
              />
              <span className="text-text text-lg font-display">
                {selectedPriority.title}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                Notes
              </Button>
              <Button variant="ghost" size="sm">
                Open PR
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearPriority}
                className="ml-auto text-overlay1"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Task selection view */
        <div>
          <p className="text-overlay0 mb-4">
            Select your ONE thing for today:
          </p>
          <div className="space-y-2">
            {displayTasks.map((task) => {
              const categoryColor = getCategoryColor(task.category)
              return (
                <button
                  key={task.id}
                  onClick={() => onSelectPriority(task)}
                  className="
                    w-full text-left
                    px-4 py-3 rounded-lg
                    cursor-pointer
                    bg-transparent border border-surface2
                    hover:bg-surface1
                    transition-all duration-150 ease-out
                    flex items-center gap-3
                    group
                    focus:outline-none focus:ring-2 focus:ring-mauve/50 focus:ring-offset-2 focus:ring-offset-surface0
                  "
                  style={{
                    ['--category-color' as string]: categoryColor,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = categoryColor
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = ''
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 transition-transform duration-150 group-hover:scale-125"
                    style={{ backgroundColor: categoryColor }}
                  />
                  <span className="text-text">{task.title}</span>
                </button>
              )
            })}
          </div>
          {availableTasks.length === 0 && (
            <p className="text-overlay1 italic text-sm">
              No tasks available. Add some tasks to get started.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
