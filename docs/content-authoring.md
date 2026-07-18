# 知识文档编写规范

## 1. 放置位置

每份公开内容只属于一个目录：

| 内容类型 | 目录 | `type` |
| --- | --- | --- |
| 小组说明 | `knowledge/group/` | `group` |
| 技术方向 | `knowledge/tracks/` | `track` |
| 例会记录 | `knowledge/meetings/` | `meeting` |
| 项目 | `knowledge/projects/` | `project` |
| 成员介绍 | `knowledge/members/` | `member` |
| 加入信息 | `knowledge/recruitment/` | `recruitment` |

模板放在 `knowledge/_templates/`，其中的文件不参与发布。`knowledge/examples/` 只演示格式，也不参与发布。

## 2. 文件命名

- 只用小写英文、数字和连字符，扩展名为 `.md`。
- 方向、项目和说明：`descriptive-title.md`。
- 例会：`yyyy-mm-dd-topic.md`。
- 成员：使用稳定的公开 ID，如 `member-alex.md`，不要使用学号、手机号或私人账号。
- 文件名发布后不复用。重命名必须保留旧 slug 跳转记录。

## 3. 通用 Frontmatter

```yaml
---
schemaVersion: 1
id: example-entry
title: 示例标题
summary: 一到两句话说明本文解决什么问题，不重复标题。
type: track
status: draft
authors:
  - member-example
tags:
  - 示例标签
publishedAt: 2026-07-17 # 非例会类型必填
updatedAt: 2026-07-17
cover: null
media: []
references: []
---
```

字段规则：

- `schemaVersion`：当前固定为 `1`。未知版本会阻断生成，不能由工具猜测迁移。
- `id`：全站唯一、稳定、小写英文加连字符；发布后不可复用。
- `title`：事实标题，不使用夸张营销文案。
- `summary`：建议 40–100 个中文字符。
- `type`：必须与所在目录匹配。
- `status`：`draft | published | archived`。`draft` 不公开；`published` 公开；`archived` 仍公开但显示明确归档标记。
- `authors`：引用 `knowledge/members/` 中的成员 ID；不允许凭空推断作者。
- `tags`：建议 1–5 个，使用现有标签表，避免同义词重复。
- `updatedAt`：所有类型必填的 ISO 日期 `YYYY-MM-DD`，修改正文时同步更新。
- `publishedAt`：仅非例会类型必填。例会禁止使用该旧字段，只使用 `heldAt`。
- `cover`：无封面写 `null`；有封面时使用从 `knowledge/` 起算的绝对内容路径。
- `media`：登记正文使用的每张图片，规则见 `docs/image-guidelines.md`。
- `references`：结构化相关资料。每一项必须同时填写类型、标题、链接和来源；没有相关资料时写 `[]`。

相关资料示例：

```yaml
references:
  - kind: article
    title: 示例文章
    url: https://example.com/article
    source: 发布组织或作者
```

`kind` 只允许：`article`（文章）、`project`（项目）、`meeting`（例会）、`guide`（技术指导）、`document`（文档）、`video`（视频）、`website`（网站）、`dataset`（数据集）、`other`（其他）。内部资料使用以 `/` 开头的站内路径；外部资料必须使用 HTTP(S) 链接。

## 4. 各类型正文结构

### 技术方向

固定顺序：内容、作者。“内容”可按主题自行增加三级标题，分类使用开放的 `tags`；相关项目、例会和文章统一写入 `references`。

### 例会记录

额外字段：

```yaml
speakers:
  - member-example
heldAt: 2026-07-17T19:00:00+08:00
```

`heldAt` 是准确的例会日期与时间，也是例会列表的筛选和排序依据。`speakers` 必须引用已发布成员 ID，页面会链接到成员详情。正文只写内容，资料统一写入 `references`。

### 项目

项目必须填写 `createdAt`，使用项目首次创建的准确日期或带时区时间；不得用知识库发布日期代替。建议顺序：背景、目标、当前状态、成果、复现或使用方式。资料统一写入 `references`。

### 成员介绍

额外字段：`grade` 使用两位入学年份（如 `"23"`），`avatarUrl` 使用本人公开 GitHub 账号的 `https://github.com/<account>.png`，`contacts` 是本人确认公开的联系方式数组。角色通过 `tags` 标记“组长”“老师”或“成员”，也可以继续添加研究兴趣标签。禁止加入私人联系方式、学号、宿舍、未授权照片或内部账号。

```yaml
grade: "23"
contacts:
  - label: GitHub
    value: public-account
    url: https://github.com/public-account
```

### 小组说明与加入信息

只写经过确认的公开信息。交流群和邮箱从站点品牌配置读取，不在多篇 Markdown 中重复硬编码。

## 5. 链接和图片

- 内部链接使用站点根路径，不写 GitHub blob URL。
- 外部资料注明标题和来源组织；必要时补充访问日期。
- 正文图片必须先登记到 `media`，再用 Markdown 引用。
- 图片不能承担唯一信息来源；图表的关键结论需要在正文说明。

## 6. 提交前自检

1. 文件目录、`type` 和 `id` 是否一致且唯一。
2. 标题、作者、日期和链接是否直接来自事实来源。
3. 是否误放了草稿、私人信息、密钥或内部 URL。
4. 每张图片是否具有 alt、来源、版权状态和正确尺寸。
5. 内部链接是否可解析，正文是否包含空标题或占位符。
6. `updatedAt` 是否反映本次修改。
