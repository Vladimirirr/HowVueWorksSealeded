# Template 与 JSX

## What is VNode

- VNode(Virtual Node) 描述 UI 节点的结构
- VTree(Virtual Nodes Tree) 由 VNode 组成的描述 UI 树的结构

Virtual 表示此数据结构与特定平台不相关。

## What is DSL

DSL(Domain Specified Language) 指的是仅在特定领域下发挥效果的语言，比如：

1. HTML & CSS 仅在 Web 下
2. SQL 仅在 RDBMS 下
3. AWK 仅在 AWK 文字处理器下

下面的 Template 和 JSX 都是描述 UI 的 DSL。

## Vue Template DSL

```vue
<template>
  <div class="infoBlock">
    <p :class="{ infoText: isShowInfoText }">
      Some something important to say about {{ sayText }}.
    </p>
    <div>
      <div>
        <button @click="doSubmit">I see.</button>
      </div>
      <Foo>
        <template v-slot:footer="data">
          <p>The data of Foo's footer is {{ data }}.</p>
        </template>
      </Foo>
    </div>
  </div>
</template>
<script>
export default {
  name: 'Component',
  data() {
    return {
      isShowInfoText: true,
      sayText: 'Unknown',
    }
  },
  methods: {
    doSubmit() {
      // do something
    },
  },
}
</script>
```

## React JSX(JavaScript with XML) DSL

```jsx
const Component = () => {
  const isShowInfoText = useState(true)
  const sayText = useState('Unknown')
  const doSubmit = () => {
    // do something
  }
  return (
    <div className="infoBlock">
      <p className={{ infoText: isShowInfoText }}>
        Some something important to say {sayText}.
      </p>
      <div>
        <div>
          <button onClick={doSubmit}>I see.</button>
        </div>
        <Foo
          renderFooter={(data) => <p>The data of Foo's footer is {data}.</p>}
        ></Foo>
      </div>
    </div>
  )
}
```

## 编译结果

两者都将被编译成 render 函数，函数返回 VNodes Tree（简称 VTree）结构的 UI 树：

```js
import { createVNode as h } from 'Vue | React'
// 习惯性地将 createVNode 称作 h 函数（VNode 的思想最早来自 hyperscript）
// https://github.com/hyperhype/hyperscript

const render = (currentState) => {
  // get the current state at this rendering time
  const { isShowInfoText, sayText, doSubmit } = currentState()
  // render the UI using the current state
  return h(
    // name
    'div',
    {
      // data
      className: 'infoBlock',
    },
    [
      // children
      h(
        'p',
        {
          className: {
            infoText: isShowInfoText,
          },
        },
        ['Some something important to say ', sayText, '.']
      ),
      h('div', null, [
        h('div', null, [
          h(
            'button',
            {
              onClick: doSubmit,
            },
            ['I see.']
          ),
        ]),
        h(
          Foo,
          {
            renderFooter: (data) =>
              h('p', null, ["The data of Foo's footer is ", data, '.']),
          },
          []
        ),
      ]),
    ]
  )
}
```

此结构与平台不相关，不同的平台渲染器（比如，DomRenderer、ServerDomRenderer、ReactNative、Weex）将渲染出对应平台真正的 UI。
