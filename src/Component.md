# 组件

## Vue 的组件

组件 = 结构 + 样式 + 逻辑 的封装

组件的基本公式：`view = render(state)`

Vue2 的组件就是一个配置对象，采取`Vue.extend`方法将此组件从对象转成组件构造函数，最终采取`new`构造组件的实例。

Vue3 的组件依旧是一个配置对象，只不过被组合式语法隐藏，采取`setup`函数暴露出来的对象就是一个配置对象，简单地说，Vue3 就是采取 JavaScript 来描述配置对象，这就好比 grunt(Vue2) 与 gulp(Vue3)。

由于全部的依赖（数据）都是响应式的（或者说都是可被观察的），依赖本身可以自由地变化（即 mutable state，与 React 的 immutable state 相对），因此只需要初始化这些依赖一次，再将它们保存在某处（比如实例对象上(Vue2)或闭包里面(Vue3)），修改依赖就能触发其对应的副效果（比如重新渲染）。

Vue2 把依赖及与依赖相关的行为（比如 computed、watch、lifecycle、renderFunction）都定义在组件的配置对象上，**基于对象**，封装手段只有不好驾驭的混入（混入是一个很经典的基于对象的封装技术，只不过很容易出错）。

Vue3 则定义在组件配置对象的 setup 函数的闭包里，**基于函数**，封装手段就相当灵活，任何函数封装的手段都适合，而且因为函数域的存在，不会出现同名标识符覆盖的问题。

假设有一门 Vue 语言，它的伪代码：

```jsx
import SubView from '/src/components/SubView' // 子组件
import SomeFeature from '/src/hooks/SomeFeature' // 可封装的公共逻辑块

// 一个对象，表示 Vue 组件就是一个对象，而非 React 的函数，Vue3 的 setup 函数只是让 Vue 组件看上去像函数一样而已
Component Foo(props) = { // props 是对象的内置值
  name = 'nat' // 定义一个普通值，不参与组件的响应式系统
  track age = 22 // 定义一个依赖，参与组件的响应式系统
  computed doubleAge = this.age * 2 // 定义一个 computed，依赖于 age，也叫做 age 依赖的 effect
  watch age(){
    // 定义一个 watch effect，依赖于 age，也叫做 age 依赖的 effect
    // do something
  }
  method addAge(){
    return ++this.age // 访问和修改
  }
  lifecycle mounted(){
    // do something
  }
  component SubView // 引入一个组件
  include [track featureA, compouted featureB] = SomeFeature(/* pass props or not */) // 导入公共逻辑（关键字 include）
  render(){
    // 组件的渲染函数，依赖于 age，也叫做 age 依赖的 effect
    // 可以从 template 模板语法里编译而来
    return <b onClick={addAge}>{age}</b>
  }
}
```

## Vue2 的组件 props

有如下父子组件：

`Foo.vue`:

```vue
<template>
  <div class="FooContainer">
    <p>{{ username }}</p>
    <p>{{ info.name }} - {{ info.age }}</p>
    <p>Hello</p>
    <!-- username 传递的是简单值，没有响应式，将在 Bar 的 initProps 里对它响应式 -->
    <!-- info 传递的是响应式的值，在 Bar 里面读取 info 依赖时将收集 Bar 的 renderWatcher -->
    <Bar :username="username" :info="info"></Bar>
  </div>
</template>
<script>
export default {
  data() {
    return {
      username: 'jack',
      info: {
        name: 'jack',
        age: 22,
      },
    }
  },
}
</script>
```

`Bar.vue`:

```vue
<template>
  <div class="BarContainer">
    <p>{{ username }}</p>
    <p>{{ info.name }} - {{ info.age }}</p>
  </div>
</template>
<script>
export default {
  props: ['username', 'info'],
}
</script>
```

Bar 组件 initProps：

```js
function initProps(vm) {
  // 1. 格式化
  // 2. 校验和求值
  // 3. 响应式
  // 4. 代理

  // vm = component instance
  // vm.propsData === VNode.componentOptions.propsData 传给 Bar 的数据，即 { username, info }
  const propsData = vm.$options.propsData || {}

  // 1. 格式化 props
  // normalizeProps 把数组格式的 props 转为 对象格式，比如 ['isDone'] => { isDone: { type: null } }
  // 其中 type 表示此 prop 需要的类型，而 null 表示不验证此 prop 类型
  const propsOptions = normalizeProps(vm.$options.propsOptions || {})
  // 保存此组件 props 的容器，和 _data 一样
  // 即 this.propName -getter-> this._props.propName
  // 即 this.dataName -getter-> this.data.dataName
  const props = (vm._props = {})
  function propInit(key) {
    if (isReservedAttribute(key)) {
      errorLog(`The attribute "${key}" is reserved.`, vm)
      return
    }
    // 2. 校验和求值 props
    const [error, value] = validateProp(key, propsOptions, propsData, vm)
    if (error) {
      errorLog(`The prop "${key}" failed to pass its validation: ${error}.`, vm)
    } else {
      // 3. 响应式 props
      // 在组件 update 的 prepatch 时，对基本类型和对象类型都是采取直接赋值
      // 对于基本类型，在 initProps 时就已经将其 reative，从而在组件 prepatch 里面更新此 prop 能使此组件 rerender
      // 对于对象，如果是已经 observed，那么只定义它整体的 getter/setter，如果是未 observed，就 observe 它，再定义它整体的 getter/setter
      // 此时，info.name 和 info.age 的 dep 将会收集 Foo 和 Bar 两个组件的 rerender
      defineReactive(props, key, value, () => {
        errorLog(`The prop "${key}" is readonly.`, vm)
      })
      // 4. 代理 props
      // 代理 propName 到 vm._props 上
      // proxy: (target, source, key) => void
      proxy(vm, '_props', key)
    }
  }
  for (const key in propsOptions) propInit(key)
}
```

## Vue2 的组件的特色

### event

组件`$emit`触发的是组件自身`$events`下的对应方法，而这些方法是父组件传来的`$listeners`。

采取模板的写法，很容易理解为：子组件和父组件真的有一套消息机制，子组件 `$emit` 把事件传到了父组件，父组件响应这个事件，这样的理解是相当棒的，它使父组件向子组件的通信高度抽象。

实际上：

```vue
<template>
  <Foo v-on:done="checkUsername"></Foo>
</template>
<script>
export default {
  methods: {
    checkUsername() {
      // ...
    },
  },
}
</script>
```

等于：

```jsx
const ViewRender = () => {
  const checkUsername = {
    // a closure so function checkUsername passed into child can access the parent component scope
    // ...
  }
  return <Foo onDone={checkUsername}></Foo>
}
```

### v-model

`prop`和`event`的语法糖。

```vue
<template>
  <div class="container">
    <div><input v-model="username" /></div>
    <div><Foo v-model="username" /></div>
    <div><Foo v-model:done="username" /></div>
  </div>
</template>
```

Compiled into:

```js
const render = () => {
  // _c = createElement
  with (this) {
    return _c('div', { staticClass: 'container' }, [
      _c('div', {}, [
        _c('input', {
          directives: [
            // save the origin v-model directive meta data here
            {
              name: 'model',
              type: '',
              params: [],
              value: username,
              expression: 'username',
            },
          ],
          // the prop
          domProps: { value: username },
          // the event
          on: {
            // listen the input element's input event
            input: ($event) => {
              username = $event.target.value
            },
          },
        }),
      ]),
      _c('div', {}, [
        _c('Foo', {
          directives: [
            // v-model meta data
            {
              name: 'model',
              type: '',
              params: [],
              value: username,
              expression: 'username',
            },
          ],
          // the prop
          props: { value: username },
          // the event
          on: {
            'update:value': ($event) => {
              username = $event
            },
          },
        }),
      ]),
      _c('div', {}, [
        _c('Foo', {
          directives: [
            // v-model meta data
            {
              name: 'model:done',
              type: 'done',
              params: [],
              value: username,
              expression: 'username',
            },
          ],
          // the prop
          props: { done: username },
          // the event
          on: {
            'update:done': ($event) => {
              username = $event
            },
          },
        }),
      ]),
    ])
  }
}
```

### slot

即 React 里的 renderProps 概念。

假设有如下两个组件：

App.vue 组件：

```vue
<template>
  <div data-component-name="App">
    <Foo>
      <div slot="header" slot-scope="titleData">
        Title: {{ titleData.title }}
        <br />
        Date: {{ titleData.date }}
      </div>
      <div>The content of Foo.</div>
      <div slot="footer"><button @ok="onOk">Ok.</button></div>
    </Foo>
  </div>
</template>
```

Compiled into:

```js
const AppRender = () => {
  // _c = createElement
  // _s = toString
  with (this) {
    return _c('div', {}, [
      _c('Foo', {
        scopedSlots: [
          {
            key: 'header',
            // a render function passed into Foo
            fn: ({ titleData }) =>
              _c('div', {}, [
                _v('Title: ' + _s(titleData.title)),
                _c('br'),
                _v('Date: ' + _s(titleData.date)),
              ]),
          },
        ],
        slots: [
          {
            key: 'footer',
            // a rendered nodes
            rendered: [_c('button', { on: { ok: onOk } }, [_v('Ok.')])],
          },
          {
            key: 'default',
            rendered: [_c('div', [_v('The content of Foo.')])],
          },
        ],
      }),
    ])
  }
}
```

Foo.vue 组件：

```vue
<template>
  <div data-component-name="Foo">
    <slot name="header" :titleData="titleData" whoami="SlotForHeader" isWhoami>
      <p>Default Title: {{ defaultTitle }}</p>
      <p>Default Date: Unknown</p>
    </slot>
    <slot>
      <p>No Content Found.</p>
    </slot>
    <slot name="footer"></slot>
  </div>
</template>
```

Compiled into:

```js
const FooRender = () => {
  // _t = renderSlot
  // _v = createTextVNode
  with (this) {
    return _c('div', { staticClass: 'FooContainer' }, [
      _t(
        'header',
        () => {
          return [
            _c('p', {}, [_v('Default Title: ' + _s(defaultTitle))]),
            _c('p', {}, [_v('Default Date: Unknown')]),
          ]
        },
        { titleData, whoami: 'SlotForHeader', isWhoami: true }
      ),
      _t('default', [_c('p', [_v('No Content Found.')])]),
      _t('footer', null),
    ])
  }
}
```

The renderSlot:

```js
const renderSlot = (slotName, fallback, props, vm) => {
  if (typeof fallback == 'function') fallback = fallback()
  const scopedSlotRender = vm.$scopedSlots[slotName]
  let renderedNodes = null
  if (scopedSlotRender) {
    // a scoped slot render found
    renderedNodes = scopedSlotRender(props) || fallback
  } else {
    const slotNodes = vm.$slots[slotName]
    renderedNodes = slotNodes
  }
  return renderedNodes || fallback
}
```

React 里的 renderProps 的示例：

```jsx
// App 组件
const App = () => {
  const onOk = () => {}
  const headerRender = (titleData) => (
    <div>
      Title: {titleData.title}
      <br />
      Date: {titleData.date}
    </div>
  )
  const footerRender = () => (
    <div>
      <button onOk={onOk}>Ok.</button>
    </div>
  )
  return (
    <div data-component-name="App">
      {/* headerRender and footerRender are the render props, because they passed a render function */}
      <Foo headerRender={headerRender} footerRender={footerRender}>
        <div>the content of Foo</div>
      </Foo>
    </div>
  )
}

// Foo 组件
const Foo = (props, children) => {
  const [{ titleData }] = useDataStore('Foo')
  const defaultNodes = <p>No Data.</p>
  const headerRenderedNodes = props.headerRender(titleData) || defaultNodes
  const footerRenderedNodes = props.footerRender() || defaultNodes
  return (
    <div data-component-name="Foo">
      {headerRenderedNodes}
      {children}
      {footerRenderedNodes}
    </div>
  )
}
```

### keep-alive

缓存它的 `children[0]` VNode （缓存了 VNode 也就缓存了它的最重要的内容 elm(rendered dom) 和 componentInstance）。

```js
const KeepAlive = {
  name: 'keep-alive',
  abstract: true, // 不会出现在父子关系链里
  props: {
    include: [String, RegExp, Array],
    max: Number,
  },
  methods: {
    /**
     * 检测 componentName 是否存在 source 里
     * @param {String | RegExp | String[] | RegExp[]} source
     * @param {String} componentName
     * @return {boolean}
     */
    matchTest(source, componentName) {
      // ...
    },
    /**
     * 销毁一个组件
     * @param {string} - cachedName
     */
    destroyComponent(cachedName) {
      this.cache.get(cachedName).componentInstance.$destroy()
    },
    /**
     * 清除不再需要缓存的组件
     * @param {String | RegExp | String[] | RegExp[]} source
     */
    pruneCache(source) {
      const pruneList = getPruneList(this.cache.getAll(), source)
      pruneList.forEach((name) => {
        this.destroyComponent(name)
        this.cache.del(name)
      })
    },
  },
  created() {
    // KeepAlive 组件采取 LRU 缓存策略
    // 此处省略 LRU 的具体细节
    this.cache = new LRUCache({
      max: this.max,
      onMax: this.destroyComponent,
    })
  },
  destroyed() {
    this.cache.clear(this.destroyComponent)
  },
  mounted() {
    this.$watch('include', (newNames) => this.pruneCache(newNames))
  },
  render() {
    // keep-alive 就是一个透传组件
    const slots = this.$slots.default
    const vnode = slots[0]
    if (!isComponent(vnode)) {
      return vnode
    }
    const componentOptions = vnode.componentOptions
    if (componentOptions) {
      const name = getComponentName(componentOptions)
      if (!name) {
        // not cache the component without name
        return vnode
      }
      if (!this.matchTest(this.include, name)) {
        // not included
        return vnode
      }

      const cache = this.cache
      const cachedName = getUniqCacheNameForComponent(vnode)
      if (cache.has(cachedName)) {
        // 赋值缓存的 componentInstance（包含了已渲染的 dom）
        // 其他的，诸如 componentOptions、context、data 均不赋值，这些将在 prepatch 时作比较
        // componentOptions includes the latest propsData and listeners
        // context is the latest parent instance
        // data includes the latest native listeners
        vnode.componentInstance = cache.get(cachedName).componentInstance
        cache.hot(cachedName)
      } else {
        cache.add(cachedName, vnode)
      }

      vnode.data.isKeepAlive = true
    }
    return vnode
  },
}
```

### transition

提供组件因为 v-if 和 v-show 导致的隐藏与显示时的钩子。从而对其中的一些时机 add 或 remove 一些样式（transition、animation、等）。

## 组件的公共逻辑封装技术

### 采取 mixin 和 HOC 组件封装技术存在的问题

1. 来源模糊：不能快速定位谁的 mixin 或 HOC 注入了此功能 -> 能快速定位谁提供了此功能
2. 命名冲突：不同 mixin 或 HOC 可能存在相同的标识符 -> 能自定义功能需要的标识符
3. 嵌套过深：HOC 的嵌套 -> 平铺而非嵌套
4. 关注分离：相同的逻辑可能被拆离到不同的钩子里（比如，设定计时器和清除计时器） -> 相同逻辑能在一起

### 采取 Hook 技术

mixin 和 HOC 的基建都是对象，而 Hook 的基建是函数，在 GUI 领域，面向对象不能发挥出它最佳的优势，而函数式编程却可以（即`UI = Render(CurrentState)`）。

Vue 的组合式语法借鉴自 React 的 Hook 语法，都是**一种更合理地组织组件内的数据与行为以及组件公共逻辑封装的编程方式**。

Hook 本意是将一些**特殊功能**（普通函数不具备的功能，比如有状态的数据、渲染钩子、等等）**钩入**到函数组件里，**钩入** -> 导入 -> 融合 -> **组合**，衍生到：将自定义 Hook 暴露的功能【钩入、组合】到组件里，故根本上`Hook === Composition`，只是不同的叫法。

而广义上，Hook **就是一个有状态的函数**，**或者说 Hook 将状态赋能给普通函数**。

自定义 Hook 对组件来说就像 C 语言的`#include`一样，将一个 Hook 的【数据和逻辑】导入（组合）到组件，是平铺的代码封装方式。

示例：
组件的 setup 执行自定义 Hook，得到需要的依赖和方法，同时安装副效果，**将这些东西组合到自己的 setup 里面**。

```jsx
import { ref, onMounted } from 'vue'

// define a custom hook
const useToggle = (init = false) => {
  const value = ref(init)
  const toggleFalse = () => (value.value = false)
  const toggleTrue = () => (value.value = true)
  const toggle = () => (value.value = !value.value)
  onMounted(() => {
    // ...
  })
  return [value, toggle, toggleFalse, toggleTrue]
}

// Foo component
const Foo = {
  setup(props) {
    const name = ref('nat')
    const [switchValue, toggleSwitch] = useToggle(false) // same as above
    return {
      name,
      switchValue,
      toggleSwitch,
    }
  },
  render(ctx) {
    // ctx is the component instance
    // the render can be compiled from a template
    return (
      <p>
        {ctx.name} is under {ctx.switchValue + ''}.
        <br />
        <button onClick={ctx.toggleSwitch}>toggle</button>
      </p>
    )
  },
  // other information of the component exposed outside
  name: 'Foo', // the component name
  props: {}, // the component props
  emits: {}, // the component emits
}

// equal to the following
const FooEquivalent = {
  setup(props) {
    const name = ref('nat')
    // just like #include in C
    const [switchValue, toggleSwitch] = ((init = false) => {
      const value = ref(init)
      const toggleFalse = () => (value.value = false)
      const toggleTrue = () => (value.value = true)
      const toggle = () => (value.value = !value.value)
      onMounted(() => {})
      return [value, toggle, toggleFalse, toggleTrue]
    })(false)
    return {
      name,
      switchValue,
      toggleSwitch,
    }
  },
  render(ctx) {
    return (
      <p>
        {ctx.name} is under {ctx.switchValue + ''}.
        <br />
        <button onClick={ctx.toggleSwitch}>toggle</button>
      </p>
    )
  },
  name: 'Foo',
  props: {},
  emits: {},
}
```
