# 命令式与声明式

两种不同的编程范式：

- 【命令式】告诉机器要怎么做（关注过程）
- 【声明式】告诉机器要做什么（关注结果）

以【如何在一个考试成绩列表中找出及格的成绩】为例，对比两种范式的区别：

命令式：

```js
import scoresArr from './scoresArr.json' // 成绩列表

// 1. 新建保存结果的数组
const result = []
// 2. 迭代此数组
for (const i of scoresArr) {
  // 3. 测试是否及格
  if (i >= 60) {
    // 4. 及格的成绩就插入
    result.push(i)
  }
}
console.log(result)

// 我们把如何解决问题的每一步都告诉机器，我们参与了解决问题的整个过程！
```

声明式：

```js
import scoresArr from './scoresArr.json' // 成绩列表

// 指令 filter：告诉机器【以 i >= 60 为测试条件过滤数组】
const result = scoresArr.filter((i) => i >= 60)
console.log(result)

// 我们只把要让机器做什么事情的指令告诉机器（至于机器到底如何去做，我们不关心），我们只参与了解决问题的关键步骤！
```

就像把【大象放进冰箱里】的步骤一样：

1. 打开冰箱门
2. 把大象放进去
3. 关上冰箱门

至于第二步到底怎么做到的我们不关心，我们只关注结果，即大象已经放进去了，这就是声明式编程的理念。

其实`HTML`和`CSS`就是典型的声明式：

```html
<!-- 告诉浏览器，我们要一个带有内容和样式的段落，具体浏览器如何在屏幕上绘制此段落我们不关心 -->
<p class="info">Some text here.</p>
<style>
  p.info {
    /* 告诉浏览器 p.info 要如下的样式，具体浏览器如何绘制样式我们不关心 */
    color: black;
    font-size: 1.2em;
    font-weight: bold;
    padding: 10px;
  }
</style>
```
