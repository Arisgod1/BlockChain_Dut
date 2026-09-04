---
schemaVersion: 1
id: blockchain-dut-knowledge-base
title: 区块链组知识库
summary: 组内持续维护的公开知识库，以 Markdown 为事实源，通过确定性生成、自动检查和 GitHub Pages 对外发布；同时沉淀了"如何维护一个长期演进的工程知识库"的方法论。
type: project
status: published
authors: [tang-mingdi]
tags: [知识库, Astro, TypeScript, 自动化, 开源, 工程实践, 学生项目]
createdAt: 2026-07-17T21:00:29+08:00
updatedAt: 2026-09-04
cover: null
media: []
references:
  - kind: project
    title: BlockChain_Dut GitHub 仓库
    url: https://github.com/Arisgod1/BlockChain_Dut
    source: GitHub
  - kind: guide
    title: 写一份耐看的文档
    url: /tracks/engineering-doc-knowledge/
    source: 站内技术指导
  - kind: guide
    title: 让系统可以慢慢长大
    url: /tracks/system-evolution-basics/
    source: 站内技术指导
  - kind: guide
    title: 和伙伴一起协作
    url: /tracks/team-collaboration-basics/
    source: 站内技术指导
  - kind: guide
    title: 写代码的小规矩
    url: /tracks/code-engineering-basics/
    source: 站内技术指导
  - kind: guide
    title: 把系统搭得能扩展
    url: /tracks/system-architecture-basics/
    source: 站内技术指导
  - kind: guide
    title: 怎么知道自己的改动真的能用
    url: /tracks/validation-and-observability/
    source: 站内技术指导
---

## 背景

组内资料需要持续增加，也需要在每次更新后保护已有页面、搜索、图片和历史链接。这个仓库把内容事实源、展示网站、维护 Skill、生成器和 CI/CD 放在同一套可追溯流程中。

同时，这个项目也承担着"把工程经验传递给新人"的角色——每年新同学加入小组时，都能从中学到**一个长期演进的工程项目是怎么组织起来的**。

## 目标

- 让成员用统一模板贡献文章、例会、项目和成员资料。
- 让增量生成与同一提交的全量重建结果一致。
- 在发布前自动检查结构、链接、图片、无障碍和页面回归。
- 保留人工预览和审核环节。
- 把建设过程本身沉淀为可复用的方法论，供后来者学习。

## 当前状态

网站已经具备首页、技术指导、例会、项目、成员、组内动态、搜索和文章详情，并通过 GitHub Actions 部署到 Pages。当前阶段正在用真实组内资料替换初期演练数据。

## 已有成果

- 仓库内 `site-maintainer` Skill 与 TypeScript CLI。
- Astro 静态站点和 Pagefind 搜索。
- Schema、Manifest、跳转、墓碑及原子生成机制。
- Playwright、axe、Lighthouse 和资源预算检查。
- 面向新人的工程经验沉淀（已合并到 `knowledge/tracks/`）。

## 沉淀的方法论

本项目不仅是"展示内容的网站"，也是"如何做内容/做工程"的学习材料。`knowledge/tracks/` 收录了从长期维护经验中提炼的六篇指南，按主题（Tag）组织，每篇都有"适合谁 / 为什么 / 怎么做 / 反模式 / 速查清单"五部分。

```text
文档 / Markdown / 知识管理
  → 写一份耐看的文档
     适合刚写笔记、想把笔记升级成可检索知识库的同学

演进 / 兼容性 / 进阶
  → 让系统可以慢慢长大
     适合维护长期演进项目、想给"系统"加新字段的人

协作 / Git / PR
  → 和伙伴一起协作
     适合第一次和同学协作、第一次提 PR 的人

代码风格 / 命名 / 错误处理
  → 写代码的小规矩
     适合想写出"耐看"代码、第一次参与团队项目的人

架构 / 进阶 / 关注点分离
  → 把系统搭得能扩展
     适合写过一些项目、想理解"好系统长什么样"的人

测试 / CI/CD / 可观测性
  → 怎么知道自己的改动真的能用
     适合想知道"上线前最少要做什么、上线后看什么"的人
```

这些经验来自一份长期维护的 Go 后端知识库，提炼时已针对"大学新生/学生能看懂"做了重新组织。

## 这个项目适合谁学习

- **想入门 Web 开发**：用真实的 Astro + TypeScript + Markdown 工具链作为案例。
- **想学知识管理**：从"如何写一份耐看的文档"开始，建立长期可检索的笔记系统。
- **想参与开源项目**：本项目是公开的，可以直接提 PR 体验完整流程。
- **想做毕业设计 / 课程设计**：本项目"内容与展示分离 + 确定性生成"的设计是很好的参考。

## 使用方式

```bash
pnpm site-maintainer check
pnpm site-maintainer update
pnpm validate
pnpm site-maintainer preview
```

## 如何贡献

- **贡献内容**：按 `knowledge/_templates/` 模板写，提交 PR。
- **贡献代码**：修改 `site/` 或 `packages/site-maintainer/`，提交 PR。
- **贡献经验**：在 `knowledge/tracks/` 写下你学到的工程经验，提交 PR。
- **反馈问题**：在 GitHub Issues 留言，或联系QQ`2934487705`。
