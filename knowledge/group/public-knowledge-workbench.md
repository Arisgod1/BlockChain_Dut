---
schemaVersion: 1
id: public-knowledge-workbench
title: 建设当前知识库
summary: 记录区块链组当前知识库从架构设计、内容规范到真实资料迁移和自动部署的建设进展。
type: group
status: published
authors:
  - tang-mingdi
tags:
  - 知识库建设
  - 小组说明
publishedAt: 2026-07-18
updatedAt: 2026-07-18
cover: null
media: []
references:
  - kind: project
    title: 区块链组知识库
    url: /projects/blockchain-dut-knowledge-base/
    source: 区块链组知识库
---

## 小组介绍

当前知识库用于集中展示组内技术指导、例会、项目、成员资料和动态。建设重点不是一次性完成页面，而是让后续内容可以用统一模板持续更新。

## 工作方式

1. `knowledge/` 保存人工确认的唯一事实源。
2. 成员使用模板新增或修改文档和图片。
3. `site-maintainer` Skill 调用确定性 CLI 完成检查、生成和预览。
4. 自动测试保护页面、搜索、图片、移动布局和无障碍表现。
5. GitHub Actions 在验证通过后构建并部署 Pages。

## 公开成果

目前已经完成基础页面、内容 Schema、Manifest、图片分类、增量生成、全量一致性检查、浏览器回归和 Pages 部署。本轮开始迁移真实成员与例会资料，并把本仓库本身纳入项目列表。

## 联系方式

加入方式统一由“如何加入”文档维护，当前公开 QQ 群二维码和联系邮箱，避免在多篇文档中重复配置。
