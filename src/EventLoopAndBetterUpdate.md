# 事件循环与更新优化

## 事件循环

The **EventLoop** model is a **concurrency** model essentially, which is **good at I/O-bound**.

事件循环本质上是一个并发模型，尤其擅长 I/O 密集型任务。

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
      const rAFListFixed = rAFList.slice() // make current rAFList fixed, so that all new added rAF will be run on next tick
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
      // **step.4** drawing cycle
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
3. setImmediate (IE only, similar to automating set the best delay value by browser for setTimeout)
4. postMessage
5. Script Tag
6. Network Event
7. UI Event
8. ...

浏览器常见的 microtask

1. Promise
2. MutationObserver
3. Object.Observer (Removed)
4. queueMicrotask
5. ...

一些注意点：

1. 如果在 microtask cycle 继续设定新的 microtask，将导致页面卡顿，因为 microtask cycle 必须要把当前的 microtask 队列执行清空而导致的
2. 如果在 rAF cycle 继续设定新的 rAF ，不会延迟页面渲染，新的 rAF 将在下一轮事件循环的 rAF cycle 再执行

## nextTick 函数

安排一系列的 microtasks。

[代码示例](./code/EventLoopAndBetterUpdate/TheNextTickFunction.html)。

## 更新优化

[代码示例](./code/EventLoopAndBetterUpdate/BetterUpdate.html)。

Vue2 的组件更新就是建立在上述代码的基础上：

- Vue2 的每个组件的 renderWatcher computedWatcher userWatcher 就是 updater
- Vue2 的 queueWatcher 即 queueUpdater，也会检查此 watcher 是否已经存在
- Vue2 的 flushCallbacks 即 beginUpdate
- Vue2 的单个 updater 默认最多更新次数是 100 而这里是 10
- Vue2 的 updater 有更细的优先级方案（即根据 watcher.id 值），而这里只有普通和紧急两种
