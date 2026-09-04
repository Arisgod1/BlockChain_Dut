---
schemaVersion: 1
id: system-evolution-basics
title: 让系统可以慢慢长大
summary: 长期演进项目的 Schema 演进、状态机、归档与删除规范。
type: track
status: published
authors:
  - tang-mingdi
tags:
  - 演进
  - 兼容性
  - Schema
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

- 维护一个长期演进的项目（学校社团、毕业设计、个人作品）
- 写过"加字段后旧内容全部报错"的痛苦
- 想知道"为什么我删一篇笔记就把全站搞崩了"

## 为什么

写第一篇文档、第一个功能时，不用考虑"演进"。但只要项目活过三个月，就会开始遇到这些问题：

- 想加一个字段，但旧文档全没有这个字段
- 想改字段语义，但旧数据已经按旧语义填了
- 想删一篇过时的文档，但别人引用过
- 想重新分类一批文档，但所有 URL 都会失效

这些不是"以后再想"的事，是"动手前就要想"的事。本节把"演进"分成两块：**Schema 演进** 和 **内容生命周期**。

## 核心原则

### 一、新字段默认"可选 + 默认值"

新人最常犯的错：加字段时让所有人都必须填。

```yaml
  # 旧版本
  title: Go 入门
  status: published

  # 新版本（错误做法）
  title: Go 入门
  status: published
  difficulty:    # ← 所有人必须补
```

正确做法：把新字段定义为"可选"，没有时用默认值。

```yaml
  # 新版本（正确做法）
  title: Go 入门
  status: published
  # difficulty 不写，默认 beginner
```

实现层面只需要一行：

```typescript
// schema 定义
difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner')
```

这样旧文档不需要改一行，新旧文档可以共存。

### 二、字段语义变了，就升版本号

如果只是加字段，不用升版本号。如果某个字段的"含义"变了（`string` 改成 `enum`、单位变了），必须升版本号：

```yaml
  # schemaVersion 1
  type: "string"          # 实际是 'group' / 'track' / ...

  # schemaVersion 2
  type: "track" | "group" | "meeting" | ...
```

升级步骤：

```text
1. 同时支持 v1 和 v2
2. 写迁移脚本把 v1 转 v2
3. 跑全量数据迁移
4. 等所有内容都迁完，移除 v1 支持
```

永远不要"今天加了明天又改回去"——这会让外部引用、缓存、自动化脚本全部错乱。

### 三、内容有"状态机"，不是字符串

很多人把状态当字符串反复横跳：

```yaml
status: draft            # 测试中
status: published        # 上线
status: draft            # 临时隐藏
status: published        # 重新上线
```

这样做的后果：

- 搜索引擎已经索引了页面，临时隐藏后 404
- 分享链接的人被带到 404
- 引用关系错乱

正确做法：把 `status` 看作"有限状态机"，明确合法路径：

```text
draft → published → archived
            ↑________↓
              重新启用
```

非法路径直接拒绝：

```text
published → draft         不允许（已公开内容不能退回草稿）
draft     → archived      不允许（草稿跳过 published 没意义）
```

### 四、删除 ≠ 改状态

想把"已发布但不想让人看"的内容"删掉"时，常见错误是改成 `draft`。这是错的——

正确做法有两种：

| 想做什么 | 怎么做 | URL 行为 |
| --- | --- | --- |
| 不再主动维护，但还想留底 | 改成 `archived` | 继续 200，显示归档标记 |
| 永久下架（敏感信息、内部讨论） | 走"删除"流程 | 跳 410 Gone，留下不可变记录 |

两种都**不能**改 `draft`。

### 五、删除和重命名要"留痕"

已发布内容的 ID 一旦复用，会出现"同一 URL 指向不同主题"的混乱。所以：

- **重命名**：建新 ID + 旧 URL 跳到新 URL（保留 5 年以上）
- **删除**：URL 返回 410 Gone，并写"墓碑"记录（永久保留）

任何"批量删除"操作前，必须先全仓库搜索"还有谁在引用"：

```bash
rg "旧-ID"  # 看哪些文档/链接还指向它
```

有引用就先解除引用，没有再删除。

## 反模式

```text
// 反例 1：加字段就让所有人补
"我加了 difficulty 字段，请大家补一下" → 默认值 + 可选才是正解

// 反例 2：状态自由切换
status: draft → published → draft → published → ...

// 反例 3：把"软删除"当删除
"先改成 draft，以后再删" → 应该用 archived 或走删除流程

// 反例 4：批量删除不做引用扫描
"这个分类不要了，全删" → 别人引用的链接全断
```

## 速查清单

每次给"系统"加东西之前，问自己：

```text
□ 新字段有默认值吗？旧内容能不改就继续工作吗？
□ 修改语义会破坏现有数据吗？需要升版本号吗？
□ 状态变化路径合法吗？能从已发布退回草稿吗？
□ 这次删除/重命名前，引用都处理了吗？
```

## 在本知识库的体现

本项目把上述原则都落实到了 schema 和工具链：

- `frontmatter` 字段全部可选 + 默认值
- `schemaVersion` 严格管理，schema 升级有迁移路径
- `status: draft | published | archived` 是 enum，不是 string
- `generated/redirects.json` 与 `tombstones.json` 永久保留历史
- `pnpm site-maintainer check` 在内容 PR 阶段就阻断非法操作

## 进一步阅读

- 上一篇：[写一份耐看的文档](/tracks/engineering-doc-knowledge/) — 文件与命名的基础
- 下一篇：[和伙伴一起协作](/tracks/team-collaboration-basics/) — 多个人改一个系统怎么不出乱子
- 本项目文档：[知识文档编写规范](https://github.com/Arisgod1/BlockChain_Dut/blob/main/docs/content-authoring.md)

## 作者

- [唐明迪](/members/tang-mingdi/)
