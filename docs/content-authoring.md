# 知识文档编写规范

## 1. 放置位置

每份公开内容只属于一个目录：

| 内容类型 | 目录 | `type` |
| --- | --- | --- |
| 小组说明 | `knowledge/group/` | `group` |
| 技术方向 | `knowledge/tracks/` | `track` |
| 例会记录 | `knowledge/meetings/` | `meeting` |
| 项目成果 | `knowledge/projects/` | `project` |
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
publishedAt: 2026-07-17
updatedAt: 2026-07-17
cover: null
media: []
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
- `publishedAt`、`updatedAt`：ISO 日期 `YYYY-MM-DD`，修改正文时更新 `updatedAt`。
- `cover`：无封面写 `null`；有封面时使用从 `knowledge/` 起算的绝对内容路径。
- `media`：登记正文使用的每张图片，规则见 `docs/image-guidelines.md`。

## 4. 各类型正文结构

### 技术方向

固定顺序：方向介绍、知识地图、推荐路径、实践项目、相关例会、作者。可增加小节，但不可删除这些一级结构。

### 例会记录

额外字段：

```yaml
speakers:
  - member-example
heldAt: 2026-07-17T19:00:00+08:00
```

正文固定顺序：内容、结论与行动项、相关资料。事实不明确时写“待确认”，不要让生成工具补全。

### 项目成果

建议顺序：背景、目标、当前状态、成果、复现或使用方式、相关资料。

### 成员介绍

只公开本人确认的信息。禁止加入私人联系方式、学号、宿舍、未授权照片或内部账号。

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
