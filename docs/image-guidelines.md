# 图片放置与命名规范

## 1. 目录

```text
knowledge/assets/
├── site/       Logo、招牌、合影、加入入口等全站素材
├── covers/     文章与项目封面，统一 3:2
├── inline/     正文截图、图表、白板和设备照片
└── avatars/    经本人授权的成员头像，统一 1:1
```

不要把新图片放在仓库根目录、`site/src/` 或生成目录中。站点构建产物由工具生成，作者只维护 `knowledge/assets/` 中的源文件。

## 2. 命名

- 小写英文、数字和连字符；不得使用空格、中文、下划线或连续连字符。
- 名称描述内容，不描述版式：`2026-summer-workshop-group-photo.jpg` 优于 `big-banner-final2.jpg`。
- 同一事件的多张图片增加稳定序号：`lab-tour-01.jpg`、`lab-tour-02.jpg`。
- 不把尺寸写进源文件名；响应式后缀由构建工具生成。
- 文件名全站不可重复，即使位于不同子目录。

推荐格式：

```text
yyyy-event-subject-sequence.ext
project-subject.ext
member-public-id.ext
```

## 3. 尺寸和格式

| 用途 | 比例 | 源文件建议 | 发布要求 |
| --- | --- | --- | --- |
| 封面 | 3:2 | 长边 1600–2400px | AVIF/WebP，单张默认 ≤250KB |
| 正文图片 | 原始比例 | 长边不超过 2400px | 最大输出宽度 1600px |
| 头像 | 1:1 | 至少 512×512px | AVIF/WebP，多尺寸输出 |
| Logo/图标 | 视素材而定 | 优先 SVG；照片不用 SVG | 保持透明背景和安全留白 |

PNG 只用于确实需要透明度或无损像素的图形。照片使用 JPEG 源文件，发布时转 AVIF/WebP。禁止放大低分辨率图片来满足尺寸。

## 4. 图片元数据

每张被文章引用的图片都必须在该文档的 `media` 中登记：

```yaml
media:
  - path: /assets/inline/example-interface-overview.png
    alt: 示例系统界面，左侧为目录，右侧为正文区域
    caption: 示例界面结构说明。
    source: 区块链组
    rights: owned
    creator: member-example
```

- `alt`：描述图片中对理解正文有用的信息；纯装饰图写空字符串。
- `caption`：可选，解释图片与上下文的关系，不重复 alt。
- `source`：图片的实际来源组织或公开 URL。
- `rights`：`owned | licensed | public-domain | permission-granted`。
- `creator`：可选，使用公开成员 ID 或明确的外部署名。

来源不明、未获授权、缺少 alt 或版权状态的图片禁止发布。

## 5. 新增流程

1. 确认图片可以公开，且画面中没有私人联系方式、屏幕密钥或未授权人脸。
2. 按用途放入 `site`、`covers`、`inline` 或 `avatars`。
3. 按规则重命名；不要覆盖同名旧文件。
4. 在引用文档的 `cover` 或 `media` 中登记路径与元数据。
5. 运行 `site-maintainer check`，检查重复路径、尺寸、alt、来源、版权和 EXIF。
6. 在本地 Preview 中检查桌面和移动裁切，再提交 PR。

## 6. 现有素材安排

| 规范路径 | 用途 | 页面位置 |
| --- | --- | --- |
| `assets/site/blockchain-group-sign.png` | 正式招牌 | 桌面页头品牌区、关于页身份区 |
| `assets/site/recruitment-mark.png` | 招新图标 | “关于与加入”入口附近，仅出现一次 |
| `assets/site/group-photo-original.jpg` | 合影源文件 | 首页小组介绍、关于页；发布时生成 3:2 衍生图 |

合影原文件包含 EXIF，且体积较大，因此不得直接部署。构建时必须移除 EXIF、裁切或生成响应式衍生图，并保留原文件作为内容源。
