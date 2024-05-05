const nextTickTasks = []
let isNextTickRunning = false

/**
 * Schedule a task.
 * @param {Function} task
 */
const nextTick = (task) => {
  nextTickTasks.push(task)

  if (isNextTickRunning) return
  isNextTickRunning = true

  queueMicrotask(() => {
    // nextTick runner
    nextTickTasks.forEach((task) => {
      // call the current task
      try {
        task()
      } catch (e) {
        console.warn('An error occurred when run the task:')
        console.warn(e)
        console.warn(task)
      }
    })
    {
      // cleanup
      nextTickTasks.length = 0
      isNextTickRunning = false
    }
  })
}

export default nextTick
