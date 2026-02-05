import { useState, useCallback } from 'react'
import { AppLayout } from './components/layout'
import { TodayView } from './views'
import { QuickCaptureModal, type QuickCaptureSubmission } from './components/ui'
import { useKeyboardShortcut } from './hooks'
import { useApp } from './lib'

function App() {
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false)
  const { addTask } = useApp()

  const openQuickCapture = useCallback(() => {
    setIsQuickCaptureOpen(true)
  }, [])

  const closeQuickCapture = useCallback(() => {
    setIsQuickCaptureOpen(false)
  }, [])

  const handleQuickCaptureSubmit = useCallback((submission: QuickCaptureSubmission) => {
    if (submission.destination === 'task') {
      const data = submission.data
      addTask({
        title: data.title,
        category: data.category,
        status: 'todo',
        dueDate: data.dueDate,
        notes: data.notes,
        link: data.link,
        isSyncPriority: false,
        sortOrder: 0,
        source: 'local',
      })
    }
  }, [addTask])

  // Register ⌘K keyboard shortcut
  useKeyboardShortcut({
    key: 'k',
    metaKey: true,
    callback: openQuickCapture,
  })

  return (
    <AppLayout>
      <TodayView onAddTask={openQuickCapture} />
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={closeQuickCapture}
        onSubmit={handleQuickCaptureSubmit}
      />
    </AppLayout>
  )
}

export default App
