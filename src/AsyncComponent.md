# 异步组件

Async Component Loader 的基本实现：

```js
/**
 * @param {() => Promise<Object>} loader - a loader for loading the async component
 * @param {VueInstance} context - the vue instance who render the async component
 * @param {Object} metaData - the meta data when render the async component
 * @param {string | Object} metaData.tag - the VNode's tag that represents the component itself
 * @param {Object} metaData.data - the VNode's data
 * @param {Array} metaData.children - the VNode's children
 */
function resolveAsyncComponent(loader, context, metaData) {
  // save all contexts(the vue instance), and will be called by forceUpdate below
  loader.contexts = loader.contexts || []
  const allContexts = loader.contexts
  if (allContexts.indexOf(context) == -1) {
    allContexts.push(context)
  }

  // if already been resolved
  if (loader.resolvedComponent) {
    return loader.resolvedComponent
  }

  // if already been error
  if (loader.error && loader.errorComponent) {
    return loader.errorComponent
  }

  // if is loading now
  if (loader.loading && loader.loadingComponent) {
    return loader.loadingComponent
  }

  // get the component constructor from its options
  const getComponentConstructor = (options) => Vue.extend(options)

  // update all saved vue instances who render the async component
  const forceUpdate = () => allContexts.forEach((vm) => vm.$forceUpdate())

  // begin to load
  loader.loading = true
  loader().then(
    (resOptions) => {
      loader.resolvedComponent = getComponentConstructor(resOptions)
      forceUpdate()
    },
    (err) => {
      console.warn('Failed to resolve the async component:')
      console.log(loader)
      console.warn(`Because that ${err.message || err.toString()}.`)
      loader.error = true
      // init errorComponent if existed
      const theErrorComponent = loader.errorComponent
      if (theErrorComponent) {
        loader.errorComponent = getComponentConstructor(theErrorComponent)
      }
      forceUpdate()
    }
  )

  // init loadingComponent if existed
  const theLoadingComponent = loader.loadingComponent
  if (theLoadingComponent) {
    loader.loadingComponent = getComponentConstructor(theLoadingComponent)
  }

  // init emptyComponent if existed
  const theEmptyComponent = loader.emptyComponent
  if (theEmptyComponent) {
    loader.emptyComponent = getComponentConstructor(theEmptyComponent)
  } else {
    // a defualt emptyComponent instead
    const defaultEmptyComponent = {
      render: () => {
        const resVNode = createEmptyVNode('placeholder for async component')
        resVNode.isAsyncPlaceholder = true
        resVNode.asyncLoader = loader
        resVNode.asyncData = metaData
        resVNode.context = context
        return resVNode
      },
    }
    loader.emptyComponent = getComponentConstructor(defaultEmptyComponent)
  }

  // return a loading component or empty
  return loader.loadingComponent || loader.emptyComponent
}
```

The useage of Async Component Loader in createComponent:

```js
/**
 * the function createComponent that is on line 4379 in [vue2.5.17-beta.0.js] will be called in function _createElement
 * the createComponent called by [vm.$createElement or vm._c](in render function) -> [createElement](for normalizing children) -> [_createElement](actual createElement)
 *
 * @param {Function | Object} ctor - the component's constructor or options
 * @param {Object} data - the component's carried data, like attrs, listeners, slots and so on
 * @param {VueInstance} context - the vue instance who render the component
 * @param {Array<VNode>} children - the component's children
 * @param {string?} tag - the component's name if existed
 * @return {VNode} - a VNode that represents the component
 */
function createComponent(ctor, data, context, children, tag) {
  if (ctor == null) {
    return
  }

  // get the component constructor from its options
  const getComponentConstructor = (options) => Vue.extend(options)

  // plain options object: turn it into a constructor
  if (typeof ctor == 'object') {
    ctor = getComponentConstructor(ctor)
  }

  // return if at this stage it's not a constructor or an async component factory
  if (typeof ctor != 'function') {
    console.warn('Invalid component found:')
    console.log(ctor)
    console.warn('When render in context:')
    console.log(context)
    return
  }

  // check if ctor is an async component loader
  const asyncLoader = ctor
  if (ctor.cid == null) {
    ctor = resolveAsyncComponent(asyncLoader, context, {
      tag,
      data,
      children,
    })
  }

  data = data || {}

  // transform component v-model data into props & events
  if (isDef(data.model)) {
    transformModel(ctor.options, data)
  }

  // extract props
  const propsData = extractPropsFromVNodeData(data, ctor, tag)

  // extract listeners, since these needs to be treated as child component listeners instead of dom listeners
  const listeners = data.on
  // replace with listeners with native modifier so it gets processed during parent component patch
  data.on = data.nativeOn

  // install component management hooks(init, prepatch, insert and destroy) onto the placeholder node
  installComponentHooks(data)

  // try to get its name if existed
  const name = ctor.options.name || tag

  // return a placeholder vnode in the context's rendered vnode tree
  const vnode = new VNode(
    'vue-component-' + ctor.cid + (name ? '-' + name : ''), // tag
    data, // data
    undefined, // children
    undefined, // text
    undefined, // elm
    context, // context
    {
      // componentOptions
      ctor: ctor,
      propsData: propsData,
      listeners: listeners,
      tag: tag,
      children: children,
    },
    asyncLoader // asyncLoader
  )

  return vnode
}
```

测试：

`main.js`:

```js
// global register the test async component
const TestAsyncComponentLoader = () =>
  new Promise((resolve, reject) => {
    // 使用 setTimeout 模拟
    setTimeout(() => {
      if (Date.now() % 2) {
        resolve({
          template: '<p><b>Resolved.</b></p>',
        })
      } else {
        reject(new Error('Load failed.'))
      }
    }, 3e3)
  })
TestAsyncComponentLoader.loadingComponent = {
  template: '<p><b>Loading.</b></p>',
}
TestAsyncComponentLoader.errorComponent = {
  template: '<p><b>Error.</b></p>',
}
Vue.component('TestAA', TestAsyncComponentLoader)
```

`App.vue`:

```vue
<template>
  <div class="AppContainer">
    <div><button @click="fn">click</button></div>
    <TestAA :count="count"></TestAA>
  </div>
</template>
<script>
export default {
  components: {},
  data() {
    return {
      count: 0,
    }
  },
  methods: {
    fn() {
      this.count++
    },
  },
}
</script>
```
