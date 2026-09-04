---
schemaVersion: 1
id: system-architecture-basics
title: 把系统搭得能扩展
summary: 协议与实现分离、薄核心、合理分层、横切关注、可演进的架构原则与反模式。
type: track
status: published
authors:
  - tang-mingdi
tags:
  - 架构
  - 关注点分离
  - 进阶
publishedAt: 2026-09-04
updatedAt: 2026-09-04
cover: null
media: []
references: []
---

## 适合谁

- 写过一些项目，但每次"加新功能"都要改一堆老文件
- 代码越写越多，想知道"哪里该拆、哪里该合"
- 想理解"好的系统长什么样"，但市面上的书都太抽象

## 为什么

新手写代码最常见的两种结局：

1. **"什么都塞 main 里"**：所有逻辑在一个 `index.ts` / `main.go` / `app.py` 里。一开始很快，三千行之后没人敢动。
2. **"过度拆分"**：每个函数一个文件，每个文件三层抽象。加一个打印要改五个地方。

这两种都不是"好的系统"。好的系统有一个共同特点：**该稳定的地方稳定，该灵活的地方灵活**。

## 核心原则

### 一、把"协议"和"实现"分开

任何系统都有两层：

```text
协议层：   承诺的对外行为、子命令、参数、返回值
实现层：   怎么做到的、用什么库、怎么处理边界
```

具体到一个 CLI：

```text
协议层（不变）
  - 子命令名：update、check、preview
  - 参数：--pr <number>
  - 退出码：0 成功、2 业务错误、3 环境错误

实现层（可换）
  - 用 sharp 还是 jimp 处理图片
  - 用 pagefind 还是别的搜索引擎
  - 用 zod 还是 joi 做 schema 校验
```

为什么重要：

- 换实现时不影响用户（"我换了图片库"用户不需要知道）
- 测试可以只针对协议（"输入 X 应该返回 Y"）
- 多人协作时可以并行（协议稳定后，各实现可以独立开发）

### 二、核心循环要"小"

不管写 CLI、写后端服务、还是写前端组件，**核心路径越短越好**。

```typescript
// 差：main 函数 200 行
async function main() {
  await loadConfig()
  await setupDatabase()
  await registerRoutes()
  await startServer()
  // ... 业务逻辑混进来
  if (someCondition) {
    await doA()
    await doB()
  }
  // ...
}

// 好：main 只负责"启动 + 等待"
async function main() {
  const app = await createApp()
  await app.start()
  await app.waitForShutdown()
}
```

经验法则：**main 函数不应该超过 50 行**。把逻辑抽到 `createApp`、`startServer`、`runXxxJob` 这种具名函数里。

### 三、用"分层"而不是"堆层"

分层不是"套娃"——不是为了分层而分层。

```text
// 错误：一层套一层
Controller → Service → Manager → Helper → Util
每一层只做"调用下一层"

// 正确：按职责分层
API 层：解析请求、参数校验
业务层：组合业务能力、处理流程
数据层：读写存储
```

判断标准：

- **业务层**应该能脱离 API 层测试（用单元测试调业务函数）
- **数据层**应该不知道业务存在（只做 CRUD）
- 改一个业务规则时，**只动业务层**

### 四、把"横切能力"放插件，不要塞主流程

横切能力 = 日志、监控、权限、缓存。它们每个功能都要用，但都不是"业务本身"。

```typescript
// 差：每个函数都加日志
async function createUser(data) {
  log.info('creating user', data)
  const user = await db.insert('users', data)
  log.info('user created', user)
  return user
}

// 好：横切能力在框架/插件层
async function createUser(data) {
  return withLogging('createUser', async () => {
    return await db.insert('users', data)
  })
}
```

具体到不同系统：

- 后端：用中间件、装饰器
- CLI：用 `core/pipeline.ts` 的"阶段"抽象
- 前端：用 HOC、Provider

### 五、新增功能前先问"它属于哪一层"

改动之前先分类：

```text
这是新的工具能力？           → 加到工具层
这是新的业务规则？           → 加到业务层
这是新的 API/接口？          → 加到 API 层
这是新的横切关注（缓存/权限） → 加到中间件
这是新的数据源？             → 加到数据层
```

不要让一个改动跨越多个边界。如果非要跨，先停下来重新设计。

### 六、"留口子"优于"做到底"

新人常犯的错：第一次写就试图"覆盖所有情况"。

```typescript
// 差：抽象到无法阅读
class AbstractUserFactoryBuilder<T extends UserConfig, R extends UserResult> {
  createStrategy(mode: 'sync' | 'async' | 'batch'): UserStrategy<T, R> { ... }
}

// 好：先写最简单的，等真有需求再抽象
function createUser(data: UserData): User {
  // 直接写
}
```

经验法则：**重复三次再抽象**。一次不抽象、两次忍一忍、第三次才抽。

## 反模式

```text
// 反例 1：一个文件搞定一切
app.ts (3000 行)

// 反例 2：过度抽象
class FactoryBuilder<T> {
  build<F extends Factory<T>>(): F { ... }
}

// 反例 3：业务逻辑写在 controller
@Controller
class UserController {
  create(req) {
    if (req.body.age < 18) {  // 业务规则写在 controller
      throw new Error('too young')
    }
    // ...
  }
}

// 反例 4：横切关注塞进每个函数
function A() { log.info(...); checkPermission(); cache(); ... }
function B() { log.info(...); checkPermission(); cache(); ... }
function C() { log.info(...); checkPermission(); cache(); ... }
```

## 速查清单

加新功能前问自己：

```text
□ 这个改动属于哪一层？（API / 业务 / 数据 / 横切）
□ 主入口函数 < 50 行吗？
□ 业务规则能脱离 API 单元测试吗？
□ 数据层不知道业务存在吗？
□ 这次抽象是因为"真有需求"还是"我担心未来"？
```

## 在本知识库的体现

本项目的 `packages/site-maintainer/` 体现了"薄核心"原则：

- `cli.ts` 只做 commander 注册，< 100 行
- `core/pipeline.ts` 描述一次 `update` 的固定阶段
- `domain/<name>/` 是各业务能力，互不依赖
- 替换图片库（sharp → 别的）只动 `domain/image/`
- 替换搜索引擎（pagefind → 别的）只动 site build 阶段

可以参考 `packages/site-maintainer/src/` 实际看分层结构。

## 进一步阅读

- 上一篇：[写代码的小规矩](/tracks/code-engineering-basics/) — 单个文件的写法
- 下一篇：[怎么知道自己的改动真的能用](/tracks/validation-and-observability/) — 怎么验证系统真的能跑

## 作者

- [唐明迪](/members/tang-mingdi/)
