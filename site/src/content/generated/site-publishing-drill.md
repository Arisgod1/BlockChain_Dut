---
schemaVersion: 1
id: site-publishing-drill
title: 站点发布演练
summary: 记录一次从 mock 内容提交到页面预览、自动检查和 GitHub Pages 部署的流程演练。
type: meeting
status: published
authors:
  - demo-maintainer
speakers:
  - demo-maintainer
tags:
  - 部署演练
  - 例会记录
heldAt: 2026-07-18T10:00:00+08:00
publishedAt: 2026-07-18
updatedAt: 2026-07-18
cover: null
media: []
---

## 内容

本次演练使用中性 mock 文档检查以下链路：

- 事实源 Schema 校验
- 增量生成与全量生成一致性
- 首页和目录聚合
- 文章详情、作者和内部链接
- Pagefind 搜索索引
- 桌面和移动页面
- GitHub Actions 与 Pages 部署

## 结论与行动项

- 演练维护者：核对生成报告和页面截图。
- 演练维护者：确认 CI 全部通过后完成部署。
- 待真实内容准备完成后，删除或归档本次 mock 数据。

## 相关资料

- [研究记录方法](/tracks/research-record-method/)
- [可持续发布流水线](/projects/sustainable-publishing-pipeline/)
