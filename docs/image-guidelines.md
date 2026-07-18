# 图片放置与命名规范

## 1. 分类目录

图片按“用途 → 内容类型 → 稳定内容 ID”归档：

```text
knowledge/assets/
├── site/
│   ├── brand/                         Logo、招牌、加入图标
│   └── photos/                        首页合影等少量长期全站照片
├── covers/
│   └── <group|tracks|meetings|projects|members|recruitment>/<entry-id>/cover.ext
├── inline/
│   └── <group|tracks|meetings|projects|members|recruitment>/<entry-id>/NN-subject.ext
├── avatars/<member-id>/avatar.ext
└── events/<yyyy>/<event-id>/NN-subject.ext
```

- `site/`：仅放跨全站长期使用的少量素材，不能当普通图片仓库。
- `covers/`：一份内容一个 ID 目录，主封面固定命名为 `cover.ext`。
- `inline/`：正文专用图片，目录必须与引用文档的类型和 ID 对应。
- `avatars/`：一个成员一个目录，只放本人确认公开的头像。
- `events/`：同一活动被多篇内容复用时使用；年份为四位数，活动 ID 使用英文连字符。

完整活动原片、RAW、PSD、工程文件和未采用照片保存在外部归档，不进入 Git。不要把图片放在仓库根目录、`site/src/`、`site/public/generated/` 或 `generated/`。

## 2. 如何选择目录

| 场景 | 放置位置 | 示例 |
| --- | --- | --- |
| 全站 Logo、招牌 | `site/brand/` | `site/brand/blockchain-group-sign.png` |
| 首页长期合影源图 | `site/photos/` | `site/photos/group-photo-original.jpg` |
| 技术指导封面 | `covers/tracks/<entry-id>/cover.jpg` | `covers/tracks/research-record-method/cover.jpg` |
| 例会正文截图 | `inline/meetings/<entry-id>/NN-subject.png` | `inline/meetings/site-publishing-drill/01-build-result.png` |
| 项目架构图 | `inline/projects/<entry-id>/NN-subject.png` | `inline/projects/sustainable-publishing-pipeline/01-architecture.png` |
| 成员头像 | `avatars/<member-id>/avatar.jpg` | `avatars/member-public-id/avatar.jpg` |
| 多篇文档共用的活动照片 | `events/<yyyy>/<event-id>/NN-subject.jpg` | `events/2026/summer-workshop/01-group-photo.jpg` |

判断顺序：只被一篇内容使用就放该内容的 `covers/` 或 `inline/`；确实被多篇内容复用才放 `events/`；只有全站长期使用才放 `site/`。

## 3. 命名

- 目录和文件只用小写英文、数字和连字符，不使用中文、空格或下划线。
- `entry-id` 必须等于引用文档 Frontmatter 的 `id`。
- 正文和活动图片使用两位稳定序号：`01-subject.ext`、`02-subject.ext`。
- 序号发布后不因删除图片而重排，避免历史链接变化。
- 名称描述图片内容，不写 `final`、`new`、`v2`、`big` 等临时状态。
- 不把输出尺寸写入源文件名；响应式尺寸由生成器命名。

## 4. 体积、尺寸与格式

| 用途 | 比例 | 源文件建议 | 单个源文件上限 |
| --- | --- | --- | --- |
| 封面 | 3:2 | 长边 1600–2400px | 8MB |
| 正文照片 | 原始比例 | 长边不超过 2400px | 8MB |
| 截图、图表 | 按内容裁切，避免无效留白 | 最大输出宽度 1600px | 8MB |
| 头像 | 1:1，至少 512×512px | 长边不超过 1600px | 8MB |
| Logo、图标 | 优先透明 PNG 或 SVG | 只保留正式版本 | 8MB |

- 照片源文件使用 JPEG；透明图形使用 PNG；已有 WebP/AVIF 可以直接使用。
- 禁止提交 RAW、PSD、AI、TIFF、HEIC、视频或 ZIP 相册。
- 单篇内容建议最多 12 张图片、源文件合计不超过 20MB；超过时拆分内容或使用外部相册。
- 删除工作区图片不会缩小 Git 历史。大批量导入前必须先筛选、压缩，再一次性提交。

## 5. Frontmatter 登记

封面通过 `cover` 登记：

```yaml
cover: /assets/covers/tracks/research-record-method/cover.jpg
```

正文图片必须在 `media` 中逐张登记：

```yaml
media:
  - path: /assets/inline/meetings/site-publishing-drill/01-build-result.png
    alt: 构建结果页面显示全部检查通过
    caption: 本次发布演练的构建结果。
    source: 区块链组
    rights: owned
    creator: member-public-id
```

- `alt`：描述对理解正文有用的信息；纯装饰图使用空字符串。
- `caption`：可选，说明图片与上下文的关系。
- `source`：真实来源组织或公开 URL。
- `rights`：`owned | licensed | public-domain | permission-granted`。
- `creator`：可选，使用公开成员 ID 或明确外部署名。

正文使用的路径必须与 `media.path` 完全一致。来源不明、未获授权或缺少必要元数据的图片禁止发布。

## 6. 新增流程

1. 先决定图片归属于哪份内容；得到稳定 `entry-id` 后再创建图片目录。
2. 确认图片可公开，不含密钥、私人联系方式或未授权人脸。
3. 只选择真正会展示的图片，压缩到尺寸和体积限制内。
4. 按目录和编号规则放置，不覆盖同名旧文件。
5. 在文档的 `cover` 或 `media` 中登记路径、alt、来源和版权。
6. 运行 `pnpm site-maintainer check`。
7. 在桌面和移动 Preview 中检查裁切、清晰度和说明文字。

## 7. 现有全站素材

| 规范路径 | 用途 |
| --- | --- |
| `assets/site/brand/blockchain-group-sign.png` | 页头和组内动态使用的正式招牌 |
| `assets/site/brand/recruitment-mark.png` | 组内动态加入入口图标 |
| `assets/site/photos/group-photo-original.jpg` | 首页合影源文件；保留约 4:3 完整画面，生成时去 EXIF并输出响应式 WebP |

发布层位于 `site/public/generated/`，由生成器覆盖。内容作者不得手工修改或把生成图复制回事实源。
