# Template 与 JSX

## What is VNode

VNode(Virtual Node) 描述 UI 结构的节点。
VTree(Virtual Nodes Tree) 由 VNode 组成的描述 UI 的树结构。

Virtual 表示此数据结构与平台无关。

## What is DSL

DSL = (Domain Specified Language)

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
```

## React JSX(JavaScript with XML) DSL

```jsx
const tree = (
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
```

## 编译结果

两者都将被编译成 render 函数，函数返回 VNodes Tree（简称 VTree）结构的 UI 树：

```js
import { createVNode as h } from 'Vue | React'
// 社区习惯性地将 createVNode 称为 h 函数，因为 VNode 的思想最早来源 hyperscript
// https://github.com/hyperhype/hyperscript

const render = () =>
  h(
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
```

此结构与平台无关，不同的平台渲染器（比如 DomRenderer、ServerDomRenderer、ReactNative、Weex）将渲染出对应的平台 UI。
