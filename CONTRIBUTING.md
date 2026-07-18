# 贡献指南

本指南说明如何安全地更新知识内容并发布网站。字段细节以 [知识文档编写规范](./docs/content-authoring.md) 为准，图片细节以 [图片放置与命名规范](./docs/image-guidelines.md) 为准。

## 贡献边界

仓库采用内容与展示分离的方式：

- `knowledge/` 是唯一人工事实源。
- 普通内容 PR 只修改 `knowledge/`。
- `site/src/content/generated/`、`site/public/generated/` 和 `generated/` 由生成器维护，不能手工编辑。
- 组件、页面、布局、样式和 Astro 配置属于网站开发，必须使用独立 PR，不能混入内容更新。
- 标题、作者、主讲人、日期、链接、联系方式、发布状态、图片来源和版权必须来自已确认事实，不能由模型推断。

## 准备环境

需要 Node.js 24 LTS、pnpm 11.9.0 和 Git。发布维护者还需要已登录的 GitHub CLI `gh`。

### 1. 克隆仓库

已有主仓库写入权限时，可以直接克隆：

```bash
git clone https://github.com/Arisgod1/BlockChain_Dut.git
cd BlockChain_Dut
```

此时 `origin` 指向主仓库。不要直接在 `main` 上编辑，先按下文创建功能分支。

### 2. 没有写入权限时先 Fork

在 GitHub 打开主仓库，点击 **Fork** 创建自己的副本，然后克隆自己的 Fork：

```bash
git clone https://github.com/<your-github-name>/BlockChain_Dut.git
cd BlockChain_Dut
git remote add upstream https://github.com/Arisgod1/BlockChain_Dut.git
git remote -v
```

这种模式下：

- `origin` 是你有权推送的个人 Fork；
- `upstream` 是区块链组主仓库；
- 功能分支推送到 `origin`，再向 `upstream/main` 创建 PR。

也可以使用 GitHub CLI 完成 Fork 和克隆：

```bash
gh repo fork Arisgod1/BlockChain_Dut --clone
cd BlockChain_Dut
```

### 3. 安装依赖

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm install
pnpm site-maintainer check
```

## 与主仓库同步

每次创建新的贡献分支前，先同步最新 `main`。

使用 Fork 的贡献者执行：

```bash
git fetch upstream
git switch main
git merge --ff-only upstream/main
git push origin main
```

如果 `--ff-only` 失败，说明个人 Fork 的 `main` 存在额外提交。不要强制覆盖；先保存需要的工作，再请维护者协助处理。

已有主仓库写入权限、`origin` 直接指向主仓库时执行：

```bash
git switch main
git pull --ff-only origin main
```

## 内容贡献流程

### 1. 创建分支

```bash
git switch -c content/short-topic
```

这条命令应在完成上一节的 `main` 同步后执行。分支名使用小写英文、数字和连字符，例如 `content/go-error-handling` 或 `content/2026-07-18-meeting`。

### 2. 从模板创建文档

根据内容类型复制 `knowledge/_templates/` 中的模板：

```bash
cp knowledge/_templates/track.md knowledge/tracks/example-topic.md
cp knowledge/_templates/meeting.md knowledge/meetings/2026-07-18-example-topic.md
cp knowledge/_templates/project.md knowledge/projects/example-project.md
cp knowledge/_templates/member.md knowledge/members/member-id.md
```

只保留实际需要新增的文件。新文档先使用：

```yaml
schemaVersion: 1
status: draft
```

`draft` 不会进入公开网站。内容完成并经过人工确认后，才能改为 `published`；不再维护但仍需公开的内容使用 `archived`。

文档目录、文件名、Frontmatter、`references` 和各类型专用字段见 [知识文档编写规范](./docs/content-authoring.md)。

### 3. 添加图片

先确定图片归属，再放入对应目录：

```text
knowledge/assets/covers/<type>/<entry-id>/cover.ext
knowledge/assets/inline/<type>/<entry-id>/01-subject.ext
knowledge/assets/events/<yyyy>/<event-id>/01-subject.ext
```

全站长期素材才允许放入 `knowledge/assets/site/`。成员头像直接填写公开 GitHub `avatarUrl`，不提交静态头像。

也允许在 Markdown 正文中直接引用稳定的 HTTPS 图片 URL：

```markdown
![图片中对理解正文有用的信息](https://example.org/path/image.png)

> 图片来源：来源组织或作者；授权：明确的许可说明。
```

外链图片必须可公开访问、允许外链展示，且不得包含临时签名、访问令牌或私人信息。外链资源不会被仓库生成器处理、压缩或保存，原站失效时页面也会失去该图；对长期重要的图片，应在获得授权后优先收录到 `knowledge/assets/`。

仓库内图片必须在文档的 `media` 中登记 alt、来源和版权状态。完整分类和命名规则见 [图片放置与命名规范](./docs/image-guidelines.md)。

### 4. 本地检查

```bash
pnpm site-maintainer check
```

检查失败时先修正文档或图片，不要绕过 Schema、链接、敏感信息或版权检查。

需要查看页面时，可以在内容分支生成本地候选结果：

```bash
pnpm site-maintainer update
pnpm site-maintainer preview
```

这些生成文件只用于本地检查，不应混入普通内容 PR。提交前用 `git status` 确保 PR 只包含计划中的 `knowledge/` 文件。

### 5. 提交内容 PR

```bash
git add knowledge/
git commit -m "content: add example topic"
git push -u origin content/short-topic
```

无论 `origin` 指向主仓库还是个人 Fork，都从该功能分支向主仓库的 `main` 创建 PR，不直接推送到 `main`。

PR 描述应说明：

- 新增、修改、重命名、归档或删除了什么；
- 标题、作者、日期和公开状态由谁确认；
- 图片来源及公开授权情况；
- 本地 `pnpm site-maintainer check` 是否通过。

删除或重命名已发布内容前必须说明原因。存在入站引用时禁止直接删除；发布过的 ID、slug 和历史 URL 不得复用。

## 网站生成与发布流程

以下步骤由维护者在内容 PR 合入后执行。

### 1. 更新生成层

```bash
git switch main
git pull --ff-only
pnpm site-maintainer check
pnpm site-maintainer update
```

生成器会在临时目录构建候选结果，校验确定性和网站构建，全部通过后才替换正式生成目录。失败时不得手工推进 Manifest。

### 2. 审查更新

```bash
git status
git diff
```

阅读 `generated/update-report.md`，确认变更只落在生成白名单：

```text
site/src/content/generated/
site/public/generated/
generated/manifest.json
generated/redirects.json
generated/tombstones.json
generated/update-report.md
generated/suggestions/
```

### 3. 预览与完整验证

```bash
pnpm site-maintainer preview
pnpm validate
pnpm test:e2e
```

至少检查受影响页面、首页聚合、搜索、标签筛选、桌面与移动导航、图片裁切、图片说明、归档状态和历史 URL。

开发服务器不包含最终 Pagefind 产物。验证最终搜索时运行：

```bash
pnpm build
pnpm preview
```

### 4. 创建网站更新 PR

先提交已审查的生成结果：

```bash
git add site/src/content/generated site/public/generated generated
git commit -m "site: publish content update"
pnpm site-maintainer publish
```

`publish` 会重新检查基线，推送 `site/update-<date>-<sha>` 分支并创建草稿 PR，不会自动合并。

网站 PR 合入 `main` 后，GitHub Actions 会运行内容检查、确定性重建、类型检查、单元测试、Playwright、axe、构建、资源预算和 Lighthouse。全部通过后才部署 GitHub Pages；部署失败时保留上一成功版本。

## 使用 Codex Skill

仓库内置 `site-maintainer` Skill。可以在 Codex 中使用：

```text
$site-maintainer 根据这些已确认资料新增内容，完成检查并启动预览，不要发布
```

人工确认后再要求：

```text
$site-maintainer 生成更新报告并准备发布 PR
```

模型生成的摘要、关联或导航文案只能先进入 `generated/suggestions/`。人工明确接受并写回 `knowledge/` 后，才会成为正式事实。

## 常用命令

| 命令 | 作用 | 是否写文件 |
| --- | --- | --- |
| `pnpm site-maintainer check` | 检查知识、图片、Schema 和 Manifest | 否 |
| `pnpm site-maintainer suggest [paths...]` | 创建待人工确认的建议稿 | 仅建议目录 |
| `pnpm site-maintainer update` | 安全生成当前内容更新 | 是 |
| `pnpm site-maintainer rebuild --all` | 从事实源全量重建 | 是 |
| `pnpm site-maintainer rebuild --pr <number>` | 校验并重建指定已合并 PR | 是 |
| `pnpm site-maintainer preview` | 启动本地开发预览 | 否 |
| `pnpm site-maintainer publish` | 验证并创建网站更新草稿 PR | 产生 GitHub 变更 |
| `pnpm validate` | 内容、类型、单测、构建和资源预算 | 构建临时产物 |
| `pnpm test:e2e` | 页面、响应式和无障碍回归 | 测试临时产物 |

## 提交前检查清单

- 只提交本次计划修改的文件。
- 文档目录、`type`、文件名和稳定 `id` 一致。
- 标题、作者、主讲人、日期、联系方式和状态已经人工确认。
- 所有资料在 `references` 中注明类型、标题、链接和来源。
- 图片路径、alt、来源和版权信息完整，不包含 EXIF 或敏感信息。
- 修改正文时同步更新 `updatedAt`。
- `pnpm site-maintainer check` 通过。
- 没有手工修改生成目录或把界面修改混入内容 PR。
