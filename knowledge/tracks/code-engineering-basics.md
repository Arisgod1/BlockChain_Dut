---
schemaVersion: 1
id: code-engineering-basics
title: 写代码的小规矩
summary: 命名、错误处理、文件组织、批量处理、调试清理等写代码时立刻能少踩坑的小习惯。
type: track
status: published
authors:
  - tang-mingdi
tags:
  - 代码风格
  - 错误处理
publishedAt: 2026-09-04
updatedAt: 2026-09-04
cover: null
media: []
references: []
---

## 适合谁

- 代码能跑但"看起来乱"，想让别人愿意 review
- 想养成"少出 bug"的习惯但不知道从哪开始
- 第一次参与团队/开源项目，想对齐"团队风格"

## 为什么

代码风格不是"个人审美"问题。统一的命名、错误处理、文件组织能直接降低三个成本：

- **阅读成本**：未来 90% 的时间是在读旧代码，不是在写新代码
- **协作成本**：风格一致的代码 review 更快、冲突更少
- **Bug 成本**：很多 bug 的根源是"边界没想清楚"

这一节不讲"哪种风格最好"，讲"养成几条习惯，能立刻少踩坑"。

## 核心原则

### 一、命名要"自解释"

```typescript
// 差
const d = new Date()
const arr = getUsers()
function process(arr) { ... }
const tmp = compute(x)

// 好
const createdAt = new Date()
const activeUsers = getActiveUsers()
function calculateDiscount(items) { ... }
const discountedPrice = computeDiscounted(price)
```

三个具体习惯：

1. **不用缩写**（除非广为人知的 `id`、`url`、`http`）
2. **不用类型名做变量名**（`stringList`、`userObj` 是反例）
3. **布尔变量问"是不是"**（`isReady`、`hasPermission`、`canEdit`）

### 二、错误处理要"显式"，不要"吞掉"

最常见的反模式：

```typescript
// 错误
try {
  await saveData(data)
} catch (err) {
  // 啥也不做
}

// 也错
try {
  await saveData(data)
} catch (err) {
  console.log(err)
}
```

正确做法：把"业务上下文"放进错误信息，然后让上层决定怎么办。

```typescript
try {
  await saveData(userId, data)
} catch (err) {
  log.error({ userId, data }, 'failed to save data')
  throw new SaveDataError(`failed for user ${userId}`, { cause: err })
}
```

关键点：

- **不静默吞错**：catch 块必须 log 或 throw
- **带上下文**：log 里要有 `userId` 之类的关键信息
- **分类**：用不同 Error 类型区分（参数错、网络错、内部错）
- **不在 catch 里搞复杂补偿**：让上层统一处理

### 三、文件组织按"业务"分，不按"类型"分

```text
// 差（按类型分）
src/
├── models/
│   ├── User.ts
│   ├── Order.ts
│   └── Product.ts
├── services/
│   ├── UserService.ts
│   ├── OrderService.ts
│   └── ProductService.ts
└── utils/
    ├── string.ts
    └── date.ts

// 好（按业务分）
src/
├── user/
│   ├── User.ts
│   ├── UserService.ts
│   └── userRepository.ts
├── order/
│   ├── Order.ts
│   └── OrderService.ts
└── product/
    └── ...
```

按业务分的好处：

- 找代码不用先想"它是 model 还是 service"
- 删除一个功能时知道删哪些文件
- 业务边界和目录边界一致

### 四、不要有"大而全"包

不要有 `utils.ts`、`common.ts`、`helpers.ts`、`shared.ts`。这些包是"懒得起名字"的产物。

```typescript
// 差：全部塞 utils
import { formatDate, validateEmail, calculateTax, sendEmail } from './utils'

// 好：每个工具一个文件
import { formatDate } from './date'
import { validateEmail } from './email'
import { calculateTax } from './tax'
import { sendEmail } from './emailSender'
```

如果一段代码只有一个地方用，就放那个地方，不要抽到"公共"里。

### 五、复用工具函数，别手写循环

```typescript
// 差：手写去重
const seen = new Set()
const uniqueIds = []
for (const id of ids) {
  if (!seen.has(id)) {
    seen.add(id)
    uniqueIds.push(id)
  }
}

// 好：用现成工具
const uniqueIds = [...new Set(ids)]
```

项目里通常有 `hslice`、`hmap`、`hfunc` 之类的工具函数。**先用这些，再考虑引第三方库**。

### 六、批量处理要分块

```typescript
// 差：一次性处理一万条
const results = await Promise.all(hugeArray.map(processOne))

// 好：分块 + 有限并发
const BATCH_SIZE = 100
for (const batch of chunk(items, BATCH_SIZE)) {
  await Promise.all(batch.map(processOne))
}
```

不分块的后果：

- 内存爆
- 数据库/网络连接数爆
- 单个失败影响全部

### 七、临时调试代码要清掉

提交前自检：

```bash
git diff main  # 一行行看改动
```

特别留意：

- `console.log('debug')`
- `// TODO: 删掉这行`
- `var x = 1  // 临时变量`
- 注释掉的代码块

临时调试代码的"临时"几乎从来不是临时的——它会一直留在生产代码里。

## 反模式汇总

```text
// 反例 1：缩写变量名
const u = getUser()
const dt = new Date()
const cnt = 0

// 反例 2：catch 吞错
try { ... } catch (e) {}

// 反例 3：utils 大杂烩
src/utils/index.ts   // 500 行啥都有

// 反例 4：批量处理无分块
items.map(async (item) => await process(item))

// 反例 5：临时 console.log 留到生产
function login() {
  console.log('debug: login called')  // 三年前的"临时"
  ...
}
```

## 速查清单

提交代码前问自己：

```text
□ 变量名不靠注释就能看懂吗？
□ catch 块有 log 或 throw 吗？带了业务上下文吗？
□ 文件按业务分了吗？没有 utils 大杂烩吗？
□ 批量操作分块了吗？
□ 临时 console.log / TODO 清掉了吗？
```

## 在本知识库的体现

本项目的 CLI 代码（`packages/site-maintainer/src/`）就是按这些原则组织的：

- `core/`（协议层）和 `domain/`（业务层）严格分离
- 每个 `domain/<name>/` 是一个业务能力，不跨业务互相 import
- `lib/` 沉淀通用工具
- 错误统一用自定义 `CliError` 类型 + 结构化日志
- 临时目录原子替换保证失败不留半成品

具体规范见本文档和后续的"系统架构"篇。

## 进一步阅读

- 上一篇：[和伙伴一起协作](/tracks/team-collaboration-basics/) — 协作时的代码边界
- 下一篇：[把系统搭得能扩展](/tracks/system-architecture-basics/) — 当代码变成"系统"时怎么组织

## 作者

- [唐明迪](/members/tang-mingdi/)
