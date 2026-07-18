# 区块链组知识库

大连理工大学区块链组的公开知识库网站，用于持续整理技术指导、例会、项目、成员资料和组内动态。

## 网站

- 线上地址：[arisgod1.github.io/BlockChain_Dut](https://arisgod1.github.io/BlockChain_Dut/)

## 工作方式

- `knowledge/` 是唯一人工事实源。
- Astro 负责静态展示，Pagefind 提供全文搜索。
- `site-maintainer` CLI 和仓库内 Skill 负责校验与确定性生成。
- 生成失败不会覆盖当前正式生成结果。
- 内容 PR 只做格式与安全检查，合入 `main` 不会自动上线。
- 维护者在 `release/*` 分支生成、预览并完成全量回归。
- 只有手动 Deploy Production 工作流会部署 Pages；`production` 始终指向最后一次成功部署。

普通内容贡献者只修改 `knowledge/`，不要手工编辑 `site/src/content/generated/` 或 `site/public/generated/`。完整步骤见 [贡献指南](./CONTRIBUTING.md)。

## 技术栈

- Astro 5、TypeScript、Astro Content Collections
- pnpm workspace、Zod、Pagefind
- Vitest、Playwright、axe、Lighthouse CI
- GitHub Actions、GitHub Pages

## 目录

```text
knowledge/                         人工维护的内容与原始图片
site/                              Astro 网站与生成后的展示内容
packages/site-maintainer/          内容校验和确定性生成 CLI
.agents/skills/site-maintainer/    Codex 内容维护 Skill
generated/                         Manifest、跳转、墓碑和更新报告
tests/                             单元、页面和视觉测试
docs/                              内容、图片等专项规范
.github/workflows/                 校验与 Pages 部署
```

详细架构和目录职责见 [知识库网站系统](./知识库网站系统.md)。

## 本地运行

环境要求：Node.js 24 LTS、pnpm 11.9.0 和 Git。

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm install
pnpm site-maintainer check
pnpm dev
```

生产构建与完整检查：

```bash
pnpm validate
pnpm test:e2e
```

## 文档

- [贡献指南](./CONTRIBUTING.md)：从创建分支到内容发布的完整流程
- [知识文档编写规范](./docs/content-authoring.md)：目录、命名、Frontmatter 和各类型字段
- [图片放置与命名规范](./docs/image-guidelines.md)：图片分类、命名、版权和引用方式
- [总体架构与验收规则](./知识库网站系统.md)：生成状态机、Manifest、CI/CD 和安全边界
- [产品定位](./PRODUCT.md)：目标用户、产品原则和内容边界
- [视觉设计规范](./DESIGN.md)：界面风格、组件、响应式和动效约束

## License

代码和内容的许可范围以仓库中的 [LICENSE](./LICENSE) 为准。引用外部资料和图片时仍须遵守其各自的来源与版权要求。
