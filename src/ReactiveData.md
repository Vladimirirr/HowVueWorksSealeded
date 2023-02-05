# 响应式的数据

术语【数据】与【值】基本同义，或：

1. 基础数据类型描述 或 键名对应的内容 使用【值】
2. 复杂数据类型描述 或 多个内容的集合 使用【数据】

数据（值）本身没有任何的响应能力，但是当我们拦截【读、写】数据的行为时，就能对数据赋能响应能力。

我们可以记录谁【读、写】了值，从而在此期间做一些额外的行为（即【读、写】行为的副作用）。

JavaScript 提供了两种技术让我们能对一个数据做响应式处理，即：

1. `Object.defineProperty`的改写值的 getter 与 setter 技术
2. `new Proxy`的对象代理技术

以技术`2`为例，对一个简单的对象数据做响应式：

```js
const originData = {
  name: 'jack',
  age: 22,
}

const printLog = (type, key, value) => {
  switch (type) {
    case 'get':
      console.log(`The key "${key}" is been reading.`)
      break
    case 'set':
      console.log(`The key "${key}" is been setting to the new value ${value}.`)
      break
  }
}
const proxiedData = new Proxy(originData, {
  get(key) {
    printLog('get', key) // 【读值】的副作用
    return originData[key]
  },
  set(key, value) {
    printLog('set', key, value) // 【写值】的副作用
    return (originData[key] = value)
  },
})
```
