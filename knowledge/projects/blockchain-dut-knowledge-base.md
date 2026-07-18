---
schemaVersion: 1
id: blockchain-dut-knowledge-base
title: 区块链组知识库
summary: 组内持续维护的公开知识库，以 Markdown 为事实源，通过确定性生成、自动检查和 GitHub Pages 对外发布。
type: project
status: published
authors: [tang-mingdi]
tags: [知识库, Astro, TypeScript, 自动化, 开源]
createdAt: 2026-07-17T21:00:29+08:00
updatedAt: 2026-07-18
cover: null
media: []
references:
  - kind: project
    title: BlockChain_Dut GitHub 仓库
    url: https://github.com/Arisgod1/BlockChain_Dut
    source: GitHub
---

## 背景

组内资料需要持续增加，也需要在每次更新后保护已有页面、搜索、图片和历史链接。这个仓库把内容事实源、展示网站、维护 Skill、生成器和 CI/CD 放在同一套可追溯流程中。

## 目标

- 让成员用统一模板贡献文章、例会、项目和成员资料。
- 让增量生成与同一提交的全量重建结果一致。
- 在发布前自动检查结构、链接、图片、无障碍和页面回归。
- 保留人工预览和审核环节。

## 当前状态

网站已经具备首页、技术指导、例会、项目、成员、组内动态、搜索和文章详情，并通过 GitHub Actions 部署到 Pages。当前阶段正在用真实组内资料替换初期演练数据。

## 已有成果

- 仓库内 `site-maintainer` Skill 与 TypeScript CLI。
- Astro 静态站点和 Pagefind 搜索。
- Schema、Manifest、跳转、墓碑及原子生成机制。
- Playwright、axe、Lighthouse 和资源预算检查。

## 使用方式

```bash
pnpm site-maintainer check
pnpm site-maintainer update
pnpm validate
pnpm site-maintainer preview
```

