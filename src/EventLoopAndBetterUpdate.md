# 事件循环与更新优化

## 事件循环

The **EventLoop** model is a **concurrency** model essentially, which is **good at I/O-bound**.

伪代码实现：

```js
while (1) {
  /* each loop means a tick */
  // **setp.1** macrotask cycle
  const macroTask = macroTaskList.shift()
  if (macroTask) {
    call('macro', macroTask)
    {
      // **step.2** microtask cycle
      while (1) {
        const microTask = microTaskList.shift()
        if (microTask) {
          call('micro', microTask)
        } else {
          break
        }
      }
    }
    {
      // **step.3** requestAnimationFrame cycle
      const rAFListFixed = rAFList.slice() // fixed current rAFList, so that all new added rAF will be run on next tick
      while (1) {
        const rAF = rAFListFixed.shift()
        if (rAF) {
          call('rAF', rAF)
        } else {
          break
        }
      }
    }
    {
      // **step.4** draw cycle
      call('Parse dom and its style')
      call('Layout')
      call('Paint')
      call('Composite')
      call('Commit for drawing')
    }
    {
      // **step.5** requestIdelCallback cycle
      while (checkIsIdel()) {
        const rIC = rICList.shift()
        if (rIC) {
          call('rIC', rIC)
        } else {
          break
        }
      }
    }
  }
}
```

浏览器常见的 macrotask

1. setTimeout
2. setInterval
3. postMessage
4. setImmediate (IE only, similar to automating set the best delay value by browser for setTimeout)
5. MessageChannel
6. Script Tag
7. Network Event
8. UI Event
9. ...

浏览器常见的 microtask

1. Promise Callback
2. MutationObserver
3. Object.Observer (Removed)
4. queueMicrotask
5. ...

一些注意点：

1. 如果在 microtask cycle 继续设定新的 microtask，将导致页面卡顿，因为 microtask cycle 必须要把当前的 microtask 队列执行清空而导致的
2. 如果在 rAF cycle 继续设定新的 rAF ，不会延迟页面渲染，新的 rAF 将在下一轮事件循环的 rAF cycle 再执行

## nextTick 函数

安排一系列的 microtasks。

```js
const nextTickTasks = [] // save the all tasks that run on microtask cycle
let isNextTicking = false // is nextTick has been called on this tick cycle
/**
 * schedule a function(named task) as a microtask
 * @param {Function} task
 */
const nextTick = (task) => {
  nextTickTasks.push(task)
  if (isNextTicking) return
  isNextTicking = true
  queueMicrotask(() => {
    nextTickTasks.forEach((task) => {
      try {
        task()
      } catch (e) {
        console.warn('An error occurred when run the task:')
        console.log(task)
      }
    })
    {
      // all nextTick tasks done and reset status
      nextTickTasks.length = 0
      isNextTicking = false
    }
  })
}
```

## 更新优化

实现思想：

```js
// 本次等待执行的更新函数队列
// 此处不使用 Set 而是 Array，是因为 Array 可以控制插入的 updater 的位置（从而赋能不同的 updater 有不同的优先级）
const updatersQueue = []

// 是否正在执行 updatersQueue 队列
let isUpdating = false

// 与是否出现无限更新相关
const updaterMaxUpdateCount = 10 // 一轮 beginUpdate 中同一个 updater 允许的最多更新次数
const updatersCurrentUpdatedCount = new Map() // 记录每个 updater 被执行的次数

/**
 * queue an updater to the updatersQueue
 * @param {Function} updater
 * @param {boolean} updater.isEmergent
 * @param {boolean} isEmergent
 * @return {boolean} success to queue or not
 */
const queueUpdater = (updater, isEmergent) => {
  const isExisted = updatersQueue.indexOf(updater) > -1
  if (isExisted) {
    // all same updaters will keep only one
    return false
  }
  if (isEmergent || updater.isEmergent) {
    // insert to head
    // implement a simple priority task scheduling
    updatersQueue.unshift(updater)
  } else {
    updatersQueue.push(updater)
  }
  return true
}

/**
 * begin the update, and call all updaters in updatersQueue
 * @param {Function} afterUpdated
 */
const beginUpdate = (afterUpdated) => {
  if (isUpdating) {
    throw 'An update is running.'
  }
  isUpdating = true
  /* call all updaers in the microtask cycle of this event loop */
  // use while to test the updatersQueue is empty now
  while (updatersQueue.length) {
    // updatersQueue is a FIFO queue, so get the head updater
    const updater = updatersQueue.shift()
    // detect if an infinite loop appeared
    if (!updatersCurrentUpdatedCount.has(updater)) {
      updatersCurrentUpdatedCount.set(updater, 0)
    }
    const updaterCurrentCount = updatersCurrentUpdatedCount.get(updater)
    if (updaterCurrentCount == updaterMaxUpdateCount) {
      console.warn('An updater caused an infinite update loop, the updater is:')
      console.log(updater)
      // abort
      break
    }
    // call this updater
    updater()
    // add the updater's count
    updatersCurrentUpdatedCount.set(updater, updaterCurrentCount + 1)
  }
  // call resetUpdate
  resetUpdate()
  // call afterUpdated hook if existed
  afterUpdated?.()
}

/**
 * reset the update status
 */
const resetUpdate = () => {
  updatersQueue.length = 0
  isUpdating = false
  updatersCurrentUpdatedCount.clear()
}

// test normal case
const testNormalCase = () => {
  const thisTestName = 'normalCase'

  const updater11 = () => console.log('Updater11 Called.')
  const updater22 = () => console.log('updater22 Called.')

  queueUpdater(updater11)
  queueUpdater(updater11) // skipped
  queueUpdater(updater22)
  queueUpdater(updater22) // skipped

  console.log('the length of updatersQueue', updatersQueue.length)

  const doBeginUpdate = () =>
    beginUpdate(() => {
      console.log(
        'In beginUpdate.afterHook: the length of updatersQueue',
        updatersQueue.length
      )
    })
  nextTick(() => console.log(`Begin to test ${thisTestName}.`))
  nextTick(doBeginUpdate)
  nextTick(() => console.log(`Finish to test ${thisTestName}.`))
}
setTimeout(testNormalCase, 0)

// test an infinite loop case
const testAnInfiniteLoopCase = () => {
  const thisTestName = 'infiniteLoopCase'

  const updater11 = () => {
    console.log('Updater11 Called.')
    // cause an infinite loop
    queueUpdater(updater11)
  }

  queueUpdater(updater11)

  console.log('the length of updatersQueue', updatersQueue.length)

  const doBeginUpdate = () =>
    beginUpdate(() => {
      console.log(
        'In beginUpdate.afterHook: the length of updatersQueue',
        updatersQueue.length
      )
    })
  nextTick(() => console.log(`Begin to test ${thisTestName}.`))
  nextTick(doBeginUpdate)
  nextTick(() => console.log(`Finish to test ${thisTestName}.`))
}
setTimeout(testAnInfiniteLoopCase, 1e3)
```

Vue2 的组件更新就是基于上述代码的原型：

- Vue2 的每个组件的 renderWatcher computedWatcher userWatcher 就是 updater
- Vue2 的 queueWatcher 即 queueUpdater，也会检查此 watcher 是否已经存在
- Vue2 的 flushCallbacks 即 beginUpdate
- Vue2 的单个 updater 默认最多更新次数是 100
- Vue2 的 updater 有更细的优先级方案（即根据 watcher.id 值），而这里只有普通和紧急两种
