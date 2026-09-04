---
schemaVersion: 1
id: team-collaboration-basics
title: 和伙伴一起协作
summary: Git 协作中最值得养成的几条习惯：分支命名、PR 标题、PR 描述、冲突处理、内容与工程 PR 分流。
type: track
status: published
authors:
  - tang-mingdi
tags:
  - 协作
  - Git
  - 代码审查
publishedAt: 2026-09-04
updatedAt: 2026-09-04
cover: null
media: []
references:
  - kind: document
    title: BlockChain_Dut 贡献指南
    url: https://github.com/Arisgod1/BlockChain_Dut/blob/main/CONTRIBUTING.md
    source: GitHub
---

## 适合谁

- 第一次和同学/队友一起改同一个项目
- 提交过 PR 但不知道为什么被退回
- 想参与开源项目但不知道从哪开始

## 为什么

一个人写代码时，"我怎么改都行"。一旦有第二个人加入，最常见的事故是：

- 两个人改了同一个文件，冲突了
- 有人提交了"半成品"代码，main 分支挂了
- 不确定某段代码是谁写的、为什么改
- "我修了你的 bug" 实际上修了别人正在写的功能

这些事故不靠"约定"避免，靠"流程"避免。这一节讲 Git 协作中**最值得养成的几条习惯**。

## 核心原则

### 一、永远从 main 拉分支，不要在 main 上改

```text
// 错误
main → 直接改 → commit → push

// 正确
main → 拉新分支 → 改 → commit → push → 提 PR → 合入 main
```

为什么：

- main 永远是"能跑的版本"
- 别人能基于最新的 main 继续工作
- 出问题时能精确回滚到合并前

`git status` 一旦发现你在 main 上有新改动，立刻 `git stash` 然后开新分支。

### 二、分支名要说人话

不要叫 `fix-bug`、`new-feature`、`my-branch`。这样的名字三个月后看根本不知道是啥。

规范格式：

```text
<类型>/<范围>/<动作>-<对象>-<编号>
```

例子：

```text
docs/readme/fix-broken-link
feat/login/add-oauth-42
fix/cart/fix-quantity-overflow-128
```

- `类型`：`feat`（新功能）、`fix`（修 bug）、`docs`（文档）、`refactor`（重构）、`chore`（杂项）
- `范围`：稳定的模块名，如 `login`、`cart`、`docs`
- `动作-对象`：动宾结构，`add-oauth`、`fix-quantity`
- 编号：可选的 issue / PR 编号，方便回溯

### 三、PR 要"小而专"

新手最容易踩的坑：攒了一周的工作，一次性提一个 2000 行的 PR。

```text
// 错误
"我把这个项目从 v1 重构到 v2 了"  → 一个 2000 行 PR

// 正确
"第一步：把 xxx 模块拆出来"        → 200 行 PR
"第二步：把 yyy 接入新接口"        → 200 行 PR
"第三步：移除旧的实现"            → 100 行 PR
```

为什么：

- 小 PR 容易 review（30 分钟能看完）
- 出问题容易回滚（一个 commit 撤销一个功能）
- 合入快，main 不阻塞别人

每完成一个**独立可演示**的小功能，就提一个 PR。

### 四、PR 标题要"自解释"

PR 标题是未来所有人搜索的入口。不要写 `update`、`fix`、`改了点东西`。

```text
// 错误
update
fix
改了点东西

// 正确
feat(login): add GitHub OAuth login
fix(cart): fix quantity overflow when adding 100+
docs(readme): fix broken link to installation guide
```

第一段是 `类型(范围):` 格式，方便自动 changelog 生成。范围用 `login` 而不是 `user-system`——短、明确。

### 五、PR 描述要回答三个问题

每个 PR 描述里至少写清楚：

```text
1. 这次改了什么？（标题 + 一两句话）
2. 为什么改？（背景、解决的问题）
3. 怎么验证？（跑了哪些命令、看了哪些截图）
```

```markdown
## 改了什么
在登录页增加 GitHub OAuth 登录。

## 为什么
原方案只支持邮箱+密码注册，新用户更倾向用 GitHub 登录。
背景讨论：issue #128

## 怎么验证
- [x] 跑通了 `pnpm test`
- [x] 本地手动测了登录、登出、刷新
- [x] 截图：![登录页](screenshot.png)
```

### 六、不同类型的 PR 走不同流程

不是所有 PR 都一样。本项目把改动分成两类：

| 类型 | 范围 | 评审要求 |
| --- | --- | --- |
| 内容 PR | 只改 `knowledge/`、图片 | 一位内容维护者确认事实 |
| 工程 PR | 改 `site/`、`packages/`、CI | 一位工程维护者确认技术方案 + 通过 CI |

两类 PR 互不干扰：内容 PR 改错不会让网站挂，工程 PR 改错不会污染内容。

### 七、冲突要早处理，不要拖

如果你拉了新分支改东西，main 已经前进很远：

```text
// 1. 切到 main 拉最新
git checkout main
git pull

// 2. 切回你的分支，把 main 合进来
git checkout your-branch
git merge main   # 或 git rebase main

// 3. 解决冲突，本地验证
pnpm test
```

不要在 PR 提了之后再去合 main——会让 review 的人看到一堆无关的冲突 diff。

## 反模式

```text
// 反例 1：在 main 上直接改
"我就改一行，先 commit 再说" → 立刻开新分支

// 反例 2：分支名看不出意图
fix-bug
new-feature
my-branch

// 反例 3：巨型 PR
"我改了一个月，全在这里了" → 拆成 5-10 个小 PR

// 反例 4：PR 描述只写"改了点东西"
// 写改了什么、为什么、怎么验证

// 反例 5：把内容修改和工程修改混在一个 PR
"我顺便把首页样式也改了" → 拆成两个 PR
```

## 速查清单

提交 PR 前自检：

```text
□ 我在专用分支上吗？（不是 main）
□ 分支名符合 <类型>/<范围>/<动作>-<对象> 吗？
□ PR 标题是 feat(scope): ... 格式吗？
□ 描述里有"改了什么 / 为什么 / 怎么验证"吗？
□ PR 只改一类内容吗？（内容 vs 工程）
□ 本地验证通过了吗？（lint、test、build）
```

## 在本知识库的体现

本项目使用 GitHub Flow + 内容/工程分离的 PR 流程：

- `main` 永远可部署
- 内容 PR 走 `pnpm site-maintainer check`
- 工程 PR 走 `pnpm validate` + `pnpm test:e2e`
- 部署是手动触发的，发布后才有 `production` 分支
- 具体流程见 [贡献指南](https://github.com/Arisgod1/BlockChain_Dut/blob/main/CONTRIBUTING.md)

## 进一步阅读

- 上一篇：[让系统可以慢慢长大](/tracks/system-evolution-basics/) — 多人改动时怎么不出乱子
- 下一篇：[写代码的小规矩](/tracks/code-engineering-basics/) — 让别人看得懂你写的代码

## 作者

- [唐明迪](/members/tang-mingdi/)
