---
schemaVersion: 1
id: sustainable-publishing-pipeline
title: 可持续发布流水线
summary: 用于验证项目成果页面的 mock 项目，展示内容检查、原子生成、回归测试和部署之间的关系。
type: project
status: published
authors:
  - demo-maintainer
tags:
  - 部署演练
  - 自动检查
publishedAt: 2026-07-18
updatedAt: 2026-07-18
cover: null
media: []
---

## 背景

知识网站需要在持续新增内容的同时保护已有页面。本项目条目用于演示项目型内容如何展示背景、目标、状态和成果。

## 目标

- 让内容作者只维护唯一事实源。
- 让相同输入产生相同网站输出。
- 让失败更新不影响已生成页面。
- 让每次部署都有检查和人工审核记录。

## 当前状态

部署演练进行中。该状态是 mock 内容的一部分，不代表真实项目进度。

## 成果

本次演练预期生成六类内容页面、搜索索引、更新报告、CI 记录和 Pages 部署记录。

## 复现或使用方式

```bash
pnpm site-maintainer check
pnpm site-maintainer update
pnpm validate
pnpm site-maintainer preview
```

## 相关资料

- [站点发布演练](/meetings/site-publishing-drill/)
- [研究记录方法](/tracks/research-record-method/)
