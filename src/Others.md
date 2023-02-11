# 其他

## Vite4 + Vue2 热更新方案

HMR = Hot Module Replace 在不重载整个组件树的前提下只更新需要更新的组件，从而做到最小更新。

Vite 暴露如下的 HMR APIs:

1. `import.meta.hot.accept((newModule) => void 0)` 模块接受自身的更新，得到模块的最新值
2. `import.meta.hot.accept(([fooNewModule]) => void 0, ['./foo.js']);` 模块接受其他模块的更新
3. `import.meta.hot.data: any` 持久化数据，在模块更新时传递下去
4. `import.meta.hot.decline()` 表示此模块不支持热更新，此模块的任何更新都需要重载整个组件树
5. `import.meta.hot.on((...args) => void)` 事件，内置事件（即将更新：beforeUpdate，即将清除：beforePrune，发生错误：error），及插件的自定义事件

vite-plugin-vue2 会把每个 vue 文件（模块）按照它的路径得到一个唯一的 id，依据此 id 将不同的 Vue 模块依赖的热更新数据保存到集合里：

```ts
type HMRRccordsMap = {
  options: VueComponentOptions // 组件选项配置对象
  constructor: VueComponentConstructor // 组件构造器，由选项配置对象生成
  instances: VueComponentInstance[] // 组件实例集合
}
const hmrRccordsMap: HMRRccordsMap[] = [] // 保存热更新模块的集合
```

在配置对象放入到集合之前，会对此配置对象增加 beforeCreate 和 beforeDestroy:

```js
beforeCreate(){
  // __id__ 表示一个字符串常量（vite-plugin-vue2 生成的唯一 id）
  const record = hmrRccordsMap[__id__]
  if (!record.constructor){
    // vite-plugin-vue2 记录了此 Vue 组件的构造函数
    record.constructor = this.constructor // 就是 Vue.extend 的结果
  }
  record.instances.push(this)
}
beforeDestroy(){
  const record = hmrRccordsMap[__id__]
  const index = instances.indexOf(this)
  record.instances.splice(index, 1)
}
```

且此 Vue 文件被 vite-plugin-vue2 注入如下热更新代码：

```js
import __VUE_HMR_RUNTIME__ from 'vite-plugin-vue2'
// 此文件（模块）在热更新下的唯一标识符
const __id__ = '7a7a37b1'
// 是否已经记录此模块
if (!__VUE_HMR_RUNTIME__.isRecorded(__id__)) {
  // 记录此模块
  // __component__ 是 @vue/compiler-sfc 的编译结果
  __VUE_HMR_RUNTIME__.createRecord(__id__, __component__.options) // hmrRccordsMap.push({ options: options, constructor: null, instances: [] })
}
// hot.accept 对同一个文件只有第一次有效
import.meta.hot.accept((newModule) => {
  if (!newModule) return
  // updateType 在 vite 的 trasform 钩子里得出
  const { default: moduleDefault, updateType } = newModule
  switch (updateType) {
    case 'template': // template 变化
      // see below
      __VUE_HMR_RUNTIME__.rerenderTemplate(__id__, moduleDefault)
      break
    case 'style': // style 变化
      // replace the old style node
      __VUE_HMR_RUNTIME__.rerenderStyle(__id__, moduleDefault)
      break
    case 'script': // script 以及其他变化
    default:
      // see below
      __VUE_HMR_RUNTIME__.rerenderAll(__id__, moduleDefault)
  }
})
```

其中 rerenderTemplate:

```js
const record = hmrRccordsMap[__id__]
const newOptions = newModule.default // 热更新得到的最新导出
{
  // update the constructor's renders only
  // note that the record.constructor.options and record.options are equal(both have same address)
  record.constructor.options.render = newOptions.render
  record.constructor.options.staticRenderFns = newOptions.staticRenderFns
}
record.instances.forEach((instance) => {
  // replace old renders
  instance.$options.render = newOptions.render
  instance.$options.staticRenderFns = newOptions.staticRenderFns
  // delete all static trees
  instance.$staticTrees.length = 0
  // call update for this instance
  instance.$forceUpdate()
})
```

其中 rerenderAll:

```js
const record = hmrRccordsMap[__id__]
const newOptions = newModule.default
makeThisOptionsCanWorkWithHMR(__id__, newOptions) // 对 newOptions 注入 beforeCreate 和 beforeDestroy
const newConstructor = Vue.extend(newOptions)
{
  // update the constructor's all important things
  record.constructor.cid = newConstructor.cid
  record.constructor.name = newConstructor.name
  record.constructor.options = newConstructor.options
  record.constructor.components = newConstructor.components
  // ...
}
record.instances.forEach((instance) => {
  if (instance.$parent) {
    // when parent rerender, a latest instance will be created from the updated constructor
    instance.$parent.$forceUpdate()
  } else if (instance.$isRoot && instance.$reload) {
    // root instance may have a reload method
    instance.$reload(newOptions)
  } else {
    // full reload required
    window.location.reload()
  }
})
```

## @vue2/compiler-sfc

@vue2/compiler-sfc：只对 template 和 style 块编译，script 块不需要编译（本身就已经是 JavaScript，transpile 使用 babel 或 **esbuild** 或 **swc**）。

- [babel](https://github.com/babel/babel): a JavaScript transpiler written in JavaScript itself
- [esbuild](https://github.com/evanw/esbuild): a JavaScript transpiler and bundler written in GoLang
- [swc](https://github.com/swc-project/swc): similar to esbuild but written in Rust

```js
// 编译模板
compiler.compileTemplate({
  source: templateCode,
  // compilerOptions: {
  //   whitespace: 'preserve', // preserve(default) or condense
  // },
  // prettify: false, // do not need to prettify, if true(default), a dependency `prettier` is required
})
// 编译样式
compiler.compileStyle({
  source: styleCode,
  id: 'data-v-xxxx', // can be omitted when scoped is false
  scoped: false, // set true(default) will add the id('data-v-xxxx') to each CSS selector for scoping
})
```

## (diff + patch) after DOM modified manually

```jsx
// color
const textColor = 'red'
// VNodes Tree 1
const tree1 = <div style={{ color: textColor }}>Hello</div>
// 渲染到文档，同时得到 app 对象
const app = render(tree1, 'div#app')
// 手动在 Element 面板将 color 从 red -> yellow
// VNodes Tree 2
const tree2 = <div style={{ color: textColor }}>Hello Updated</div>
// 更新视图
app.patch(tree2)
// 正常的 diff + patch 结果不会改变目标元素 color 目前的 yellow 值，因为两次新旧 VNodes Tree 的 color(textColor) 都一样，不会触发 color 值的 patch
```

Vue2、React16、React18、Preact10 测试均正常，但是 Vue3 会将 color 的值重置回 red。
Vue3 对 `<tagName :style="{ color: textColor }" />` 这样的 style 值视作动态值，每次 patch 都会重新执行完整的 setProps -> setStyle 从而覆盖被手动修改的 color 值，即便两次的新旧 VNodes Tree 值都一样，这是由于 Vue3 的高度模板优化导致的“问题”。

## Headless UI

没有样式和结构的 UI 组件，只是暴露出此组件需要的基本逻辑 api，比如：

```jsx
import { useCounter } from 'nextui/headless/react'
import myCounterStyles from './index.module.scss'

const App = () => {
  const { rootProps, inputProps, minusBtnProps, plusBtnProps } = useCounter({
    init: 0,
    step: 1,
    onChange: (e) => console.log('currentCount', e),
  })
  // 暴露出一个计数器组件需要的基础逻辑，可以传入参数定制默认的基本逻辑
  // 样式完全自定义
  return (
    <div {...rootProps} class={myCounterStyles.container}>
      <button {...minusBtnProps} class={myCounterStyles.leftBtn}>
        &nbsp;-&nbsp;
      </button>
      <input {...inputProps} class={myCounterStyles.centerInput} />
      <button {...plusBtnProps} class={myCounterStyles.rightBtn}>
        &nbsp;+&nbsp;
      </button>
    </div>
  )
}
```

## 前端框架演进史

### Vanilla JavaScript (AKA. Pure JavaScript)

**蛮荒时代。**

使用完全手写的 JavaScript HTML 和 CSS。

### Utilities Library

**前端进入工具方法复用时代。**

逻辑方面：封装常用的 dom 操作，代表：jQuery
结构和样式方面：封装常用的结构和它的 css 样式，代表：bootstrap

### Component with MVC

**前端进入设计模式和组件组合时代。**

引入面向对象领域的 MVC 设计模式，使用此设计模式定义组件：

1. 组件的数据（状态） = Model（获取、保存数据，触发更新）
2. 组件的结构和样式 = View（视图使用模板引擎生成）
3. 组件的逻辑 = Controller（更新视图，组件通信，组件挂载、更新和销毁，路由，等其他）

代表：backbone

### The Framework focusing on View

**前端框架正式诞生。**

提出 MVVM 设计模式，每个框架使用自己的 DSL 来描述各自的组件，**框架的运行时**将管理这些组件，负责它们的：挂载、更新、销毁、通信、组合、缓存、等。

奠定组件的定义：`UI = Render(State)`，前端框架从传统的专注面向对象的设计模式转换到面向函数的设计模式。

代表：Vue React

### The Framework focusing on Smaller and Faster bundle

**关注构建产物的体积大小和执行速度。**

返璞归真，这些框架依旧延续上一代框架的组件设计思想，只不过最终编译出的构建产物不再包含庞大的运行时，而是能独立运行的 JavaScript。

代表：SvelteJS SolidJS

### Expect something more magical to happen

等待前端下一次的变天。
