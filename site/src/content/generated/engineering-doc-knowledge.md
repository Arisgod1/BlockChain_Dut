---
schemaVersion: 1
id: engineering-doc-knowledge
title: 写一份耐看的文档
summary: 写笔记的命名、组织、引用与归档规范，把日记式笔记升级成可检索知识库。
type: track
status: published
authors:
  - tang-mingdi
tags:
  - 文档
  - 知识管理
  - 入门
  - Markdown
publishedAt: 2026-09-04
updatedAt: 2026-09-04
cover: null
media: []
references:
  - kind: document
    title: 知识文档编写规范
    url: https://github.com/Arisgod1/BlockChain_Dut/blob/main/docs/content-authoring.md
    source: GitHub
---

## 适合谁

- 刚开始写学习笔记、项目文档、读书总结的同学
- 笔记已经写了几十篇，但找东西很费劲的人
- 想把"日记式"笔记升级成"可检索知识库"的人

## 为什么

把笔记堆在一个文件夹里看起来很省事，但只要数量超过 20 篇，痛苦就开始了：

- 找不到三个月前写的那篇并发笔记
- 给同一件事起了好几个不同名字
- 想删一篇过时的，又怕别人引用过
- 改一个文件名，所有链接全失效

上面这些坑，**几乎每个长期写文档的人都会遇到**。这套方法不是"官方标准"，是踩过坑之后总结出来的"少踩坑"做法。

## 核心原则

### 一、文档分三层，但只用一个文件夹

别把笔记和正式文档分开放——只要命名规范，一个文件夹就够了：

```text
notes/
├── daily/           临时记录、过程笔记，可以过期
├── guides/          长期有效的指南（操作步骤、规则、模板）
└── archive/         已经过时但还要留底的内容
```

判断标准很简单：

- 还能用得上 → `guides/`
- 只是当时的过程 → `daily/`
- 不再使用但不能删 → `archive/`

不要做"再加一层 personal / work / school"——分类一旦太细，找东西反而更难。

### 二、文件名用小写英文加连字符

```text
好：go-concurrency-basics.md
差：Go 并发基础.md
差：go_concurrency_basics.md
差：go_concurrency_basics_v2.md
```

为什么：

- GitHub、VSCode、终端对中文路径支持不好
- 链接引用时不需要转义
- 排序时按字母顺序自然成组
- 没有 `final`、`v2`、`new` 这种临时状态词

约定几条规则：

- 只用小写英文、数字、连字符
- 不超过 5 个单词
- 不用 `_` 分隔（搜索时不友好）
- 不加 `.md` 之外的扩展名

### 三、每个文件有"稳定 ID"

文件路径就是 ID。如果改了文件名，引用关系就断了。

```text
guide：notes/guides/go-concurrency-basics.md
id：   go-concurrency-basics
```

所以：**起名要慎重**。改文件名不只是文件本身的事，所有引用过它的链接都要跟着改。

如果非要改名：

```text
1. 先全局搜，看有多少地方引用了旧名
2. 用 git mv 改名（保留历史）
3. 全局替换引用
4. 提交
```

### 四、文档之间用结构化"引用"，不是裸链接

不好的写法：

```markdown
详见之前那篇 Go 笔记。
```

好的写法：

```markdown
参见 [Go 并发基础：Goroutine 与 Channel](/tracks/code-engineering-basics/)
```

如果引用的是外部资源，把"标题 + 链接 + 来源"写全：

```markdown
- [Go Concurrency Patterns](https://go.dev/blog/pipelines) — Google 官方博客
```

裸链接在打印、离线阅读、链接失效时全部失灵。

### 五、归档 ≠ 删除

文档过时了，不要直接删：

- 改文件名加 `-archived` 后缀
- 或放进 `archive/` 文件夹
- 文件头注明归档日期和原因

```markdown
> **状态**：已归档（2025-08-01）
> **原因**：Go 1.21 之后官方文档已涵盖，本文内容过时
```

归档的文档仍然可能被引用、也可能有人搜索到，保留下来成本几乎为零，删了反而可能让人误以为"这个东西我从来没写过"。

## 反模式

```text
// 反例 1：所有笔记平铺在一个文件夹
notes/
├── 2024-01-01.md
├── 2024-01-15.md
├── go笔记.md
├── 项目总结.md
└── 临时想法.md

// 反例 2：文件名带版本号
go-basics-v1.md
go-basics-final.md
go-basics-old.md

// 反例 3：分类按时间或来源，不按主题
2024-Q1/
个人项目/
工作/
```

## 速查清单

写一份新文档之前，先问自己三个问题：

```text
□ 这份文档会存在多久？临时过程 → daily，长期指南 → guides
□ 文件名是稳定 ID 吗？小写英文、不带版本号、不带临时词
□ 文档之间用结构化引用了吗？标题 + 链接 + 来源
```

## 在本知识库的体现

本项目的 `knowledge/` 就是按这个原则组织的：

```text
knowledge/
├── group/           小组介绍
├── tracks/          长期技术指南
├── meetings/        例会记录（带日期）
├── projects/        项目说明
├── members/         成员资料
├── recruitment/     加入方式
├── _templates/      模板（不发布）
└── examples/        示例（不发布）
```

每份文档的 frontmatter 都有 `id` 字段，发布后永不修改。

## 进一步阅读

- 本项目规范：[知识文档编写规范](https://github.com/Arisgod1/BlockChain_Dut/blob/main/docs/content-authoring.md) — 具体的字段与目录规范
- 下一篇：[让系统可以慢慢长大](/tracks/system-evolution-basics/) — 当文档变成"系统"时怎么演进

## 作者

- [唐明迪](/members/tang-mingdi/)
