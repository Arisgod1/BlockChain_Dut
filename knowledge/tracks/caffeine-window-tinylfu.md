---
schemaVersion: 1
id: caffeine-window-tinylfu
title: "06｜W-TinyLFU：窗口、分段 LRU 与频率准入"
summary: "容量分区、访问顺序和频率估计共同决定驻留，不能概括成“就是 LFU”。"
type: track
status: draft
authors: [zhang-honghao]
tags: ["Java", "缓存", "并发"]
publishedAt: 2026-11-25
updatedAt: 2026-11-25
cover: null
media: []
references:
  - kind: document
    title: "Caffeine Efficiency"
    url: "https://github.com/ben-manes/caffeine/wiki/Efficiency"
    source: "Caffeine"
  - kind: document
    title: "Caffeine v3.3.1 FrequencySketch"
    url: "https://github.com/ben-manes/caffeine/blob/aabb24230296101f179e425b71bb64d62ded3189/caffeine/src/main/java/com/github/benmanes/caffeine/cache/FrequencySketch.java"
    source: "Caffeine"
---

## 内容

> 源码版本：Caffeine v3.3.1；提交 `aabb24230296101f179e425b71bb64d62ded3189`。


本篇先画数据怎样在三个区域流动，再读准入比较与 FrequencySketch。
算法不直接运行在每次业务 get 上，而是在缓存的异步维护路径中消费事件后执行。
容量分区、访问顺序和频率估计共同决定驻留，不能概括成“就是 LFU”。

### 设计图与主流程

```text
新节点 → Window LRU
窗口超额 → 候选进入 Main Probation → TinyLFU 比较候选与受害者
  候选获准入 → 淘汰受害者
  候选未获准入 → 淘汰候选
Main Probation 命中 → Main Protected
Main Protected 超额 → Main Probation
```

### 1. 初始分区与动态容量

初始 main 约占 99%，其中 protected 约占 main 的 80%。
整数截断使极小容量的实际占比偏离理想百分比。
以 maximum=1000 推导：window=10，protected=792，probation 的目标余量=198。
这只是起始形状，自适应窗口会在 window 与 protected 间转移预算。
evictFromWindow 按窗口预算把最旧候选转移到 probation，并返回第一候选。
单轮转移有预算，resize 后巨大欠账可以分轮维护。

固定版本原始源码：[BoundedLocalCache.java](https://github.com/ben-manes/caffeine/blob/aabb24230296101f179e425b71bb64d62ded3189/caffeine/src/main/java/com/github/benmanes/caffeine/cache/BoundedLocalCache.java#L659-L733)，第 659–733 行。

### 2. 主区淘汰：候选与受害者怎么选择

主循环只在 weightedSize 大于 maximum 时继续。
默认从 probation 选受害者；不足时才向 protected、window 回退。
candidate 与 victim 可能恰好指向同一节点，需要专门处理。
零权重节点跳过，引用已回收、节点已删除、候选单项超重也都有独立分支。
这些工程边界必须先于频率比赛处理，不能只截取最后的 admit 条件来解释整个淘汰。
加权缓存一次候选保留可能需要释放多个旧条目，总预算由循环保证。

固定版本原始源码：[BoundedLocalCache.java](https://github.com/ben-manes/caffeine/blob/aabb24230296101f179e425b71bb64d62ded3189/caffeine/src/main/java/com/github/benmanes/caffeine/cache/BoundedLocalCache.java#L735-L841)，第 735–841 行。

### 3. 准入比较：为什么并非纯粹“大于就进”

admit 先比较 FrequencySketch 的候选与受害者频率。
候选更热则准入，否则在达到阈值时保留小概率随机逃逸。
这一分支降低哈希碰撞或恶意分布把某些条目长期压制的风险。
因此实验不应把一次同频竞争的唯一结果写死为算法契约。
evictAndAdvance 先保存 next 再移除，避免链表断开后丢失遍历位置。

固定版本原始源码：[BoundedLocalCache.java](https://github.com/ben-manes/caffeine/blob/aabb24230296101f179e425b71bb64d62ded3189/caffeine/src/main/java/com/github/benmanes/caffeine/cache/BoundedLocalCache.java#L843-L876)，第 843–876 行。

### 4. 真实移除：算法决定还要经过并发复查

选择受害者不等于立即无条件删除。
evictEntry 在 CHM 计算与节点锁内重新核对当前值、时间与权重。
并发读取可能延长过期，并发写入可能改变值，因此预先决定的移除原因可能不再成立。
真正删除之后才 unlink、makeDead、记录统计与发出通知。
生命周期状态也决定是否需要清理已经 retire 的旧节点。
算法与数据并发协议就是在这一层交接。

固定版本原始源码：[BoundedLocalCache.java](https://github.com/ben-manes/caffeine/blob/aabb24230296101f179e425b71bb64d62ded3189/caffeine/src/main/java/com/github/benmanes/caffeine/cache/BoundedLocalCache.java#L1054-L1137)，第 1054–1137 行。

### 5. 访问顺序与晋升

命中 window 时移到窗口尾，命中 protected 时移到保护区尾。
命中 probation 时尝试晋升 protected，后续超额由维护尾部的降级处理。
这就是分段 LRU 的一次命中晋升逻辑。
超过 protected 预算的单个条目无法放进保护区，只在 probation 重排。
草图估计用于准入，队列位置用于挑选比较对象，两者承担不同职责。

固定版本原始源码：[BoundedLocalCache.java](https://github.com/ben-manes/caffeine/blob/aabb24230296101f179e425b71bb64d62ded3189/caffeine/src/main/java/com/github/benmanes/caffeine/cache/BoundedLocalCache.java#L1901-L1957)，第 1901–1957 行。

### 6. 区域转移：队列指针与预算必须一起改

transfer 接收 from/to，在移出旧队列时扣旧区域预算，在进入新区时加新区域预算。
同时更新节点 queueType，使后续任务知道节点属于哪个区域。
probation 的大小由总量减去其他两区推导，因此不是每区都各自维护相同字段。
demoteFromMainProtected 每轮有限量搬迁，并在剩余欠账时重新标记维护。
只改队列链接或只改计数都会破坏后续预算推导。

固定版本原始源码：[BoundedLocalCache.java](https://github.com/ben-manes/caffeine/blob/aabb24230296101f179e425b71bb64d62ded3189/caffeine/src/main/java/com/github/benmanes/caffeine/cache/BoundedLocalCache.java#L1243-L1295)，第 1243–1295 行。

### 7. 草图的空间组织与初始化

一个 long 放 16 个 4-bit 计数器，每个计数最大为 15。
每个键映射四个计数，查询取最小值，得到近似频率。
ensureCapacity 按预估条目数选择 2 的幂容量，表只增长，缩小时调整样本周期。
同一键的四次访问集中在局部块，服务于 CPU 缓存局部性。
这里的“频率”有碰撞误差，不能拿它当精确请求次数。
未初始化时 frequency 返回 0，increment 不记录，这与懒初始化策略相配合。

固定版本原始源码：[FrequencySketch.java](https://github.com/ben-manes/caffeine/blob/aabb24230296101f179e425b71bb64d62ded3189/caffeine/src/main/java/com/github/benmanes/caffeine/cache/FrequencySketch.java#L17-L102)，第 17–102 行。

### 8. 查询与四路增量：位操作逐步展开

spread 混合原始 hashCode，rehash 再产生用于计数器选择的位。
block 决定局部块，slot 决定 long，index 决定 long 中哪个四位段。
读取时右移 index*4 再与 0xf，得到单个计数。
increment 把四路循环展开，并用按位或保证四次增量全部尝试。
如果任一计数确实增加，则推动 size 达到样本阈值后衰减。
只反复访问已经完全饱和的同一个键，不等同于每次都推进衰减时钟。

固定版本原始源码：[FrequencySketch.java](https://github.com/ben-manes/caffeine/blob/aabb24230296101f179e425b71bb64d62ded3189/caffeine/src/main/java/com/github/benmanes/caffeine/cache/FrequencySketch.java#L104-L180)，第 104–180 行。

### 9. 饱和、哈希与整体减半

incrementAt 先构造当前 nibble 的 0xf 掩码，未饱和才加 1。
reset 将每个 long 右移一位，再用 RESET_MASK 清除跨 nibble 的污染位。
ONE_MASK 辅助统计奇数计数，修正整体 size。
历史热度不断衰减，给新热点留下机会，而不是保存进程启动以来的终身访问量。
位运算示例：单 nibble 从 15 右移并掩码后变 7，从 2 变 1。
具体跨 long 布局仍应使用原始代码运行，不能把整体 long 的普通右移视为完整算法。

固定版本原始源码：[FrequencySketch.java](https://github.com/ben-manes/caffeine/blob/aabb24230296101f179e425b71bb64d62ded3189/caffeine/src/main/java/com/github/benmanes/caffeine/cache/FrequencySketch.java#L182-L231)，第 182–231 行。

## 作者

张鸿昊。本文摘自 RaftByJava 学习笔记。
