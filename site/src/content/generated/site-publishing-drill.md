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
updatedAt: 2026-07-18
cover: null
media: []
references:
  - kind: guide
    title: 研究记录方法
    url: /tracks/research-record-method/
    source: 区块链组知识库（部署演练）
  - kind: project
    title: 可持续发布流水线
    url: /projects/sustainable-publishing-pipeline/
    source: 区块链组知识库（部署演练）
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
