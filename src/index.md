# 目录

## -1、前言

> 本系列文章从宏观方向阐述了 Vue2.x 的基本实现思想，是 Vue 实现思想的入门教程。深入一门技术时，整体方向是最重要的，一旦方向是对的，剩下的就是时间问题（比如，一些内置函数的具体实现）。

> 尽管现在 Vue 已经全系到了 Vue3.x，但是最核心的【响应式思想】换汤不换药，Vue3.x 可以概况到：
>
> 1. 提高了响应式的性能：defineProperty -> Proxy
> 2. 提高了从模板转译而来的 render 函数的性能：更强的静态优化策略
> 3. 提高了代码的可维护性：引入组合式语法，从面向对象到投抱函数式，根本上降低了 mixin 和 HOC 带来的混乱

## 0、整体设计思想

### 响应式的系统

```mermaid
flowchart TD

dataIn["data"]
dataOut["observable <--观察着-- observer(由 getters & setters 组成)"]
ob["observe"]
sub["subscriber"]
subs["此值的 subscribers"]
effect["effect(a render, computed, watching, ...)"]

dataIn --> ob --"make observable"--> dataOut

dataOut --"getter \n读值 + 收集到"--> subs
dataOut --"setter \n写值 + 通知到"--> subs --"依次通知"--> sub

sub --"反向收集"--> subs
sub --"触发"--> effect

effect --"读取"--> dataOut

linkStyle 2,7 stroke:pink
linkStyle 3,4,6 stroke:green
```

注释：

1. observer 是 data 的观察者，观察并记录着任何东西对 data 的读写
2. 在 Vue2 里，observer 由 data 对象的所有 getter 和 setter 共同实现
3. 当一个值在一个副效果里被读取时，此值即此副效果的一个依赖（从副效果的方向看值），而副效果也即此值的一个订阅者（从值的方向看副效果）
4. 一个响应式值的副效果指的是，当此值变化了，除了此值本身的内容已发生改变，还会触发一些其他的行为，这些行为即此值的副效果，比如 re-render、re-computed

链接到 Vue2：

1. subscribers = Vue2's dependencies，从其他方向看待，副效果也是响应式值的依赖
2. subscriber = Vue2's watcher，含义相似，即 subscribing = watching = listening

### 组件树的组合

备注：

1. 实线：DOM 树里真实节点间的索引
2. 点线：Vue 组件在 DOM 树里透传其内部 DOM 节点们的暗示

```mermaid
flowchart TD

divApp["挂载点 \n div#app"]

cpnRoot["Root根组件"]
cpnRootElm1["根组件的根节点 \n div.RootContainer"]
cpnRootElm2["根节点的一个子节点 \n div.RootContainer > p"]
cpnRootElm3["此p节点的文本内容 \n 'Hello, World.'"]

cpnFoo["Foo组件 \n 根组件的一个子组件"]
cpnFooElm1["Foo组件的根节点 \n div.FooContainer"]
cpnFooElm2["根节点的一个子节点 \n  div.FooContainer > img"]

cpnBar["Bar组件 \n Foo组件的一个子组件"]
cpnBarElm1["Bar组件的根节点 \n div.BarContainer"]

divApp --> cpnRoot

cpnRoot -.-> cpnRootElm1
cpnRootElm1 --> cpnRootElm2 --> cpnRootElm3
cpnRootElm1 --> cpnFoo

cpnFoo -.-> cpnFooElm1
cpnFooElm1 --> cpnFooElm2
cpnFooElm1 --> cpnBar

cpnBar -.-> cpnBarElm1

```

## 1、命令式与声明式

[Open.](./TheWriteMode.md)

## 2、响应式的数据

[Open.](./ReactiveData.md)

## 3、观察者模式与发布订阅模式（事件总线）

[Open.](./ObserverAndPubSub.md)

## 4、Template 与 JSX

[Open.](./TemplateAndJSX.md)

## 5、响应式系统与副效果

[Open.](./ReactiveSystemWithEffect.md)

## 6、渲染器

[Open.](./Renderer.md)

## 7、组件

[Open.](./Component.md)

## 8、Async 组件

[Open.](./AsyncComponent.md)

## 9、组件树的构造

[Open.](./BuildComponentsTree.md)

## 10、事件循环与更新优化

[Open.](./EventLoopAndBetterUpdate.md)

## 11、向前兼容：引入组合式语法

[Open.](./Setup.md)

## 11、其他

[Open.](./Others.md)

## 12、JavaScript 语言特性

[Open.](./TheJS.md)
