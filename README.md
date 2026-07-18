# 区块链组知识库

区块链组的公开知识库网站。项目关注的不是一次性做出几张页面，而是让成员可以持续提交 Markdown 和图片，并通过统一的 Skill、确定性生成器、自动检查和人工审核安全发布。

> “区块链组”是组织名称。本仓库中的模板和示例只演示内容结构，不编写或虚构区块链专业知识。

## 项目特点

- **事实源唯一**：成员只维护 `knowledge/`，生成目录不能反向成为事实来源。
- **可持续更新**：新增、修改、重命名、归档和删除都有固定流程。
- **确定性生成**：相同输入必须产生相同输出；增量更新失败不会破坏当前生成结果。
- **内容与界面隔离**：内容更新只能写入白名单目录，不能顺手修改组件、布局和样式。
- **历史可追溯**：Manifest 保存来源、哈希、公开 URL、跳转和删除记录。
- **发布前验证**：检查 Schema、敏感信息、链接、图片、构建、搜索、页面契约、无障碍和资源预算。
- **静态部署**：网站使用 Astro 构建并部署至 GitHub Pages，无运行时后端。

## 技术栈

- Astro 5、TypeScript、Astro Content Collections
- Pagefind 中文全文搜索
- pnpm workspace
- Zod 内容 Schema
- Vitest、Playwright、axe、Lighthouse CI
- GitHub Actions、GitHub Pages
- 仓库内 Codex Skill：`site-maintainer`

## 目录结构

```text
.
├── knowledge/                       # 唯一人工事实源
│   ├── group/                       # 小组说明
│   ├── tracks/                      # 技术方向
│   ├── meetings/                    # 例会记录
│   ├── projects/                    # 项目
│   ├── members/                     # 成员公开资料
│   ├── recruitment/                 # 加入信息
│   ├── assets/                      # 原始图片
│   ├── _templates/                  # 可复制模板，不发布
│   └── examples/                    # 中性格式示例，不发布
├── site/                            # Astro 展示层
│   ├── src/content/generated/       # CLI 生成的规范化内容
│   └── public/generated/            # CLI 生成的图片和公开数据
├── packages/site-maintainer/        # 确定性 TypeScript CLI
├── .agents/skills/site-maintainer/  # Codex Skill 与维护流程
├── generated/                       # Manifest、跳转、墓碑和更新报告
├── tests/                           # 页面契约与视觉测试
├── docs/                            # 内容和图片贡献规范
└── .github/workflows/               # 校验与 Pages 部署
```

目录职责的完整定义见 [知识库网站系统.md](./知识库网站系统.md)。

## 环境要求

- Node.js 24 LTS
- pnpm 11.9.0
- Git
- GitHub CLI `gh`：仅 `rebuild --pr` 和 `publish` 需要

安装 pnpm：

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
```

## 首次启动

```bash
pnpm install
pnpm site-maintainer check
pnpm site-maintainer rebuild --all
pnpm dev
```

开发地址：

```text
http://localhost:4321/BlockChain_Dut/
```

目前没有正式发布的知识文档时，网站会展示真实空状态；`knowledge/examples/` 中的 draft 示例不会进入网站。

## 日常新增知识

### 1. 创建草稿

先阅读：

- [知识文档编写规范](./docs/content-authoring.md)
- [图片放置与命名规范](./docs/image-guidelines.md)

从 `knowledge/_templates/` 复制与内容类型对应的模板。例如：

```bash
cp knowledge/_templates/meeting.md knowledge/meetings/2026-07-18-example-topic.md
```

新文档必须先保持：

```yaml
schemaVersion: 1
status: draft
```

文件名、`id`、作者、日期、链接和状态必须来自已确认事实，不能由模型推断。

所有相关资料必须写入 Frontmatter 的 `references`，并注明资料类型、标题、链接和来源；正文不再维护自由格式的“相关资料”列表。

### 2. 检查草稿

```bash
pnpm site-maintainer check
```

检查通过后提交内容 PR。草稿不会出现在公开网站。

### 3. 确认发布

内容经人工确认后，将 `status` 改为 `published`；仍需公开但不再维护的内容使用 `archived`。归档内容仍能访问，并显示明确的归档状态。

### 4. 生成网站更新

内容 PR 合入后，在最新 `main` 上运行：

```bash
git pull --ff-only
pnpm site-maintainer update
```

生成器会：

1. 校验知识文档和图片。
2. 在临时目录连续生成两份候选结果。
3. 比较规范化输出哈希。
4. 构建 Astro 与 Pagefind。
5. 全部通过后替换正式生成目录。
6. 输出 `generated/update-report.md`。

任何步骤失败都会阻止更新，并保留原有生成结果。

### 5. 人工预览

```bash
pnpm site-maintainer preview
```

至少检查：

- 本次新增或修改的页面
- 首页聚合内容
- 桌面和移动导航
- 图片裁切、alt 和说明文字
- 超长标题、空结果和归档状态

开发服务器不包含最终 Pagefind 产物。需要验证完整搜索时运行：

```bash
pnpm build
pnpm preview
```

### 6. 发布网站更新

确认 `generated/update-report.md` 和 Git diff 后，提交生成结果，再运行：

```bash
pnpm site-maintainer publish
```

`publish` 会重新执行发布门槛，推送 `site/update-<date>-<sha>` 分支并创建草稿 PR。它不会自动合并 PR。

## 新增图片

图片只能放入以下目录：

| 用途 | 目录 |
| --- | --- |
| Logo、招牌、加入图标 | `knowledge/assets/site/brand/` |
| 首页合影等长期照片 | `knowledge/assets/site/photos/` |
| 内容封面 | `knowledge/assets/covers/<type>/<entry-id>/cover.ext` |
| 正文截图、图表和照片 | `knowledge/assets/inline/<type>/<entry-id>/NN-subject.ext` |
| 经本人授权的成员头像 | `knowledge/assets/avatars/<member-id>/avatar.ext` |
| 多篇内容共用的活动精选图 | `knowledge/assets/events/<yyyy>/<event-id>/NN-subject.ext` |
| 全站公开联系方式图片 | `knowledge/assets/site/contact/<channel>-qr.ext` |

文件名只能使用小写英文、数字和连字符。每张正文图片都要在文档的 `media` 中登记路径、alt、来源和版权状态。

原始素材保存在 `knowledge/assets/`；发布用图片由生成器去除 EXIF、压缩并写入 `site/public/generated/`。不要手动编辑生成图片。

完整要求见 [图片放置与命名规范](./docs/image-guidelines.md)。

## Site Maintainer 命令

| 命令 | 作用 | 是否修改文件 |
| --- | --- | --- |
| `pnpm site-maintainer check` | 检查知识、图片、Schema 和 Manifest | 否 |
| `pnpm site-maintainer suggest [paths...]` | 创建模型建议稿入口 | 仅 `generated/suggestions/` |
| `pnpm site-maintainer update` | 从当前事实源安全生成网站更新 | 是 |
| `pnpm site-maintainer rebuild --all` | 全量确定性重建 | 是 |
| `pnpm site-maintainer rebuild --pr <number>` | 校验并重建指定已合并 PR | 是 |
| `pnpm site-maintainer preview` | 启动本地开发预览 | 否 |
| `pnpm site-maintainer publish` | 验证、推送分支并创建草稿 PR | 会产生 GitHub 变更 |

在 Codex 中也可以直接调用：

```text
$site-maintainer 检查并更新知识库网站
```

Skill 入口见 [.agents/skills/site-maintainer/SKILL.md](./.agents/skills/site-maintainer/SKILL.md)。

## 模型使用边界

模型可以提出：

- 摘要候选
- 内容关联候选
- 导航文案候选
- 内容结构整理建议

模型不能直接决定或推断：

- 标题、作者、主讲人和日期
- 链接、联系方式和发布状态
- 内容 ID、URL 和删除记录
- 图片来源与版权状态

模型输出只能先进入 `generated/suggestions/`；人工确认并写回 `knowledge/` 后，才会成为正式事实源。

## 写入安全边界

普通内容更新只能修改：

```text
site/src/content/generated/
site/public/generated/
generated/manifest.json
generated/redirects.json
generated/tombstones.json
generated/update-report.md
generated/suggestions/
```

内容更新不得修改：

```text
site/src/components/
site/src/layouts/
site/src/pages/
site/src/styles/
site/astro.config.mjs
```

界面或组件调整必须作为独立开发任务进行，不能混入知识更新。

## 验证命令

日常完整检查：

```bash
pnpm validate
```

它包含：内容检查、类型检查、单元测试、生产构建、Pagefind 和 JS/CSS 预算。

分别执行：

```bash
pnpm typecheck       # TypeScript 与 Astro
pnpm test            # CLI 与 Schema 单元测试
pnpm build           # Astro、Sitemap、RSS、Pagefind
pnpm test:budgets    # 压缩 JS ≤50KB、CSS ≤35KB
pnpm test:e2e        # Playwright、axe、页面契约与响应式检查
```

GitHub Actions 还会运行 Lighthouse，要求 Performance、Accessibility、Best Practices 和 SEO 均不低于 95。

## 发布与回滚

- 内容 PR 合入本身不会让 draft 公开。
- 网站更新 PR 合入 `main` 且校验成功后，GitHub Actions 部署 GitHub Pages。
- Pages 工作流使用并发锁，旧构建不能覆盖新部署。
- 部署失败时保留上一成功产物。
- 回滚通过恢复上一网站更新提交完成，不直接修改线上构建文件。

## 重要状态文件

- `generated/manifest.json`：处理基线、来源、哈希和公开 URL。
- `generated/redirects.json`：内容重命名后的永久跳转。
- `generated/tombstones.json`：删除内容的历史占位记录。
- `generated/update-report.md`：本次生成的审查报告。

发布后的 ID 和 URL 不得复用。存在入站引用的文档或图片不能直接删除。

## 相关文档

- [产品定位](./PRODUCT.md)
- [视觉设计规范](./DESIGN.md)
- [总体架构与验收规则](./知识库网站系统.md)
- [知识文档编写规范](./docs/content-authoring.md)
- [图片放置与命名规范](./docs/image-guidelines.md)

## 当前状态

- 网站、CLI、Skill、Manifest、CI/CD 和空状态页面已经建立。
- 当前没有正式发布的知识文档。
- 现有品牌图片已经进入受管素材目录。
- 首次提交基线后，应重新运行 `pnpm site-maintainer rebuild --all` 并提交生成结果，使 Manifest 绑定首次包含 `knowledge/` 的提交。
