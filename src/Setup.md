# Setup

Vue2.7 反向引入了 Vue3 的组合式语法，从而能在 Vue2 里写 Vue3 的组合式语法。不过注意的是，Vue2.7 的组合式语法仍是基于 Vue2 的响应式系统，即还是 `defineProperty` 一套而非 Vue3 的 `Proxy`。

我们将从下面这些点出发来介绍 Vue2.7 里对组合式语法的内部实现：

## setup

安装一个组件的基本信息，即之前的，data、methods、watch、lifecycles、等等的组件选项，只不过不再需要离散地写在各个地方，都揉捏在了 setup 函数里面，从而可在此函数里自由组合。

每次需要实例化一个组件时都会调用它。

```js
// 此函数在 new VueComponentConstructor 里被 called
function initState(vm) {
  var opts = vm.$options

  // props
  initProps(vm)

  // Composition API
  initSetup(vm)

  // methods
  initMethods(vm)

  // data
  initData(vm)

  // computed
  initComputed(vm)

  // watch
  initWatch(vm)
}

function initSetup(vm) {
  var options = vm.$options
  var setup = options.setup
  if (setup) {
    var ctx = createSetupContext(vm) // 得到传入到 setup 函数里的二号参数，一个对象 { attrs: getter, slots: getter, emit: Function }
    vm._setupContext = ctx
    setCurrentInstance(vm) // 设置 currentInstance，供给 getCurrentInstance 方法
    var setupResult = invokeWithErrorHandling(
      /* function */ setup,
      /* context */ null,
      /* args */ [vm._props, ctx],
      /* vm */ vm,
      /* desc */ 'setup'
    )
    setCurrentInstance(null)
    if (isFunction(setupResult)) {
      // treat as a render
      options.render = setupResult
    } else if (isObject(setupResult)) {
      // bindings
      vm._setupState = setupResult
      for (var key in setupResult) {
        if (!isReserved(key)) {
          // 代理 setupResult 到 vm 上，处理了 ref 类型特有的 value
          proxySetupProperty(vm, setupResult, key)
        }
      }
    } else {
      // 其他返回值
    }
  }
}
function proxySetupProperty(vm, setupResult, key) {
  const raw = setupResult[key]
  const unwrap = isRef(raw)
  const get = unwrap ? () => raw.value : () => setupResult[key]
  const set = unwrap ? (v) => (raw.value = v) : (v) => (setupResult[key] = v)
  Object.defineProperty(vm, key, {
    enumerable: true,
    configurable: true,
    get
    set
  })
}
```

## ref 与 reactive

定义响应式的值。

Vue2.7 抽离和泛化了定义响应式值的途径，之前，只能在组件的 data 选项里定义这些响应式值，现在能在任何地方定义一个响应式值，并在需要的时候将其引入到一个副效果里，从而使其绑定此副效果。

### reactive

定义响应式化的对象。

在 Vue2.7 里的实现基理：

```js
function reactive(target) {
  makeReactive(target)
  return target
}
function makeReactive(target) {
  // 对即将响应式化的对象做一些检测，保证它是合法的可响应式的对象
  // ...
  return observe(target)
}
```

### ref

定义响应式化的普通值。

如果需要对普通值响应式化，则需要把此值包装到一个对象里，从而得到此普通值的一个引用，因此 ref 正是 reference 的缩写。

举个例子，你不能在数字 `2` 下进行 `defineProperty`，但是可在对象 `{ value: 2 }` 下进行，这便是 ref 的基理。

## watch 与 watchEffect

它们底层都是调用的 `new Watcher`。

## EffectScope

集中管理多个副效果。

## 总结
