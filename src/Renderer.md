# 渲染器

渲染器是 VTree 的最终实践者，它把 VTree 渲染出来，同时在 VTree 改变时最小代价地修改已经渲染出来的内容。

术语：

1. `mount` = 渲染器首次渲染一棵组件树 VTree，将渲染结果挂载到当前的 UI 树
2. `diff` = 渲染器比较新旧两棵 VTree，找出不同的地方
3. `patch` = 将`diff`的结果映射到当前的渲染内容

- 有些渲染器的 diff 和 patch 同时进行，diff 出不同的内容时就直接 patch （Vue 2 & 3）
- 有些不是，而是将 diff 出来的不同结果整体交给 patch，再由 patch 完成不同内容的修改 （React 在 concurrent with fiber 模式下的渲染）

比较规则：

1. 只同级比较
2. 如果父元素的类型改变，父元素的整棵树重新构造
3. 可以使用 key 显式标记一个元素（组件）是否可以复用

```js
// View1 and View2 both are type of VTree.

const View1 = (
  <p>
    I like <b>apple</b>.
  </p>
)
const renderer = DomRenderer.render(
  /* initVTree */ View1,
  /* targetToRender */ 'div#target'
)

// update View later
setTimeout(() => {
  const View2 = (
    <p>
      I like <b>banana</b>.
    </p>
  )
  renderer.update(/* oldVTree */ View1, /* newVTree */ View2)
  // after the update, only the content of tag <b> changed
}, 9000)
```

## Vue2 的渲染器

Vue2 的 DomRenderer（渲染 VTree 到 dom 树）渲染器构建在 [snabbdom](https://github.com/snabbdom/snabbdom) 的基础上。
