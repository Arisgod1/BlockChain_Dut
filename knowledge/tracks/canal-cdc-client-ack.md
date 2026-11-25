---
schemaVersion: 1
id: canal-cdc-client-ack
title: "客户端订阅协议与 Get/Ack/Rollback 全流程 —— 源码全流程解析"
summary: "看清 batchId、cursor、EventStore 三者在“至少一次投递（at-least-once）”语义下是如何协同工作的。"
type: track
status: draft
authors: [zhang-honghao]
tags: ["数据库", "CDC", "Canal"]
publishedAt: 2026-11-25
updatedAt: 2026-11-25
cover: null
media: []
references:
  - kind: document
    title: "Canal Introduction"
    url: "https://github.com/alibaba/canal/wiki/Introduction"
    source: "Alibaba Canal"
  - kind: project
    title: "Canal 源码"
    url: "https://github.com/alibaba/canal"
    source: "Alibaba Canal"
---

## 内容

> 本文聚焦 Canal 数据面最靠近使用者的一层：**客户端与服务端之间的 TCP 交互协议**。

### 一、CanalConnector 接口设计

#### 1.1 接口全貌

客户端所有能力都收敛在 `CanalConnector` 这个接口上（`client/.../CanalConnector.java`）。它是业务方唯一需要面对的 API 抽象，`SimpleCanalConnector`（单机）和 `ClusterCanalConnector`（集群）是它的两个实现。

```java
public interface CanalConnector {

    void connect() throws CanalClientException;                 // 建立链接（含握手+认证）
    void disconnect() throws CanalClientException;              // 释放链接
    boolean checkValid() throws CanalClientException;           // 检查链接是否处于"工作节点"状态

    void subscribe(String filter) throws CanalClientException;  // 订阅（带 filter）
    void subscribe() throws CanalClientException;               // 订阅（用服务端配置的 filter）
    void unsubscribe() throws CanalClientException;             // 取消订阅

    Message get(int batchSize) throws CanalClientException;                       // 获取+自动确认
    Message get(int batchSize, Long timeout, TimeUnit unit) throws CanalClientException;

    Message getWithoutAck(int batchSize) throws CanalClientException;             // 获取但不确认
    Message getWithoutAck(int batchSize, Long timeout, TimeUnit unit) throws CanalClientException;

    void ack(long batchId) throws CanalClientException;         // 确认（<= batchId 的都确认）
    void rollback(long batchId) throws CanalClientException;    // 回滚指定批次
    void rollback() throws CanalClientException;                // 回滚所有未 ack 批次
}
```

把这 13 个方法按语义分组，脉络就清晰了：

| 分组 | 方法 | 作用 |
| --- | --- | --- |
| 连接生命周期 | `connect` / `disconnect` / `checkValid` | 建连、断连、判活 |
| 订阅关系 | `subscribe` / `unsubscribe` | 声明本客户端要消费哪个 destination、按什么 filter 过滤 |
| 数据获取 | `get` / `getWithoutAck` | 从服务端拉取一批变更数据 |
| 消费确认 | `ack` / `rollback` | 告诉服务端"这批我处理成功了/失败了" |

#### 1.2 为什么要设计 `getWithoutAck`？—— at-least-once 语义的基石

这是 Canal 客户端 API 设计里最值得玩味的一点。乍看之下，`get(batchSize)` 已经很好用了：拉一批、自动确认、返回。为什么还要暴露一个"拉了但不确认"的 `getWithoutAck`？

答案藏在**消费的可靠性语义**里。考虑这样一个业务流程：

```
拉取数据 → 写入下游 DB/MQ → 确认
```

如果用 `get(batchSize)`（自动确认），确认动作发生在**数据刚拉到客户端内存、业务代码还没来得及处理**的时刻。此时一旦业务处理失败（写下游 DB 抛异常、进程崩溃），这批数据已经被服务端标记为"已确认"，cursor 已经前移，**这批数据就永久丢失了**——服务端不会再投递第二次。这是 **at-most-once（至多一次）** 语义，会丢数据。

而 `getWithoutAck` 把"确认"这个动作的控制权交还给了业务方：

```java
Message message = connector.getWithoutAck(batchSize);   // 拉取，但服务端仍认为"你还没确认"
long batchId = message.getId();
try {
    doBusiness(message);          // 业务处理（写下游）
    connector.ack(batchId);       // 处理成功后才确认
} catch (Exception e) {
    connector.rollback(batchId);  // 处理失败则回滚，下次会重新拉到这批
}
```

在这种模式下：

- 如果 `doBusiness` 成功、`ack` 也成功：数据被消费一次，cursor 前移。理想情况。
- 如果 `doBusiness` 失败：`rollback` 让服务端"退回"这批，下次 `getWithoutAck` 会**重新拉到同一批数据**。数据没丢，但可能重复。
- 如果 `doBusiness` 成功、但 `ack` 之前进程崩溃了：重启重连后，`rollbackOnConnect` 自动回滚，下次会**重新拉到已经处理过的那批**。数据没丢，但会重复处理。

使用 `getWithoutAck` 后，客户端应先完成并持久化下游写入，再调用 `ack`。在事件仍可回放且消费位点正确恢复的前提下，未确认的批次可以重投。下游可以按稳定事件 ID 去重，或使用带版本约束的幂等更新。

> `get` 会自动确认批次。客户端收到后若在持久化结果前退出，该批次可能无法按未确认批次回放。

#### 1.3 `get` 就是 `getWithoutAck` + 立即 `ack`

翻开 `SimpleCanalConnector` 的实现，这一点一目了然：

```java
@Override
public Message get(int batchSize, Long timeout, TimeUnit unit) throws CanalClientException {
    Message message = getWithoutAck(batchSize, timeout, unit);
    ack(message.getId());   // 拉完立刻确认
    return message;
}
```

`get` 只是把 `getWithoutAck` 和 `ack` 组合起来的语法糖。因为 `ack` 紧跟在拉取之后、在业务处理之前，所以它天然是 at-most-once 的。理解了这一层，就能理解为什么框架层面同时保留了两套 API：`get` 给"不在乎丢一点数据、图省事"的场景，`getWithoutAck` 给"绝不能丢数据"的场景。

#### 1.4 `checkValid` 与集群语义

`checkValid` 这个方法在单机模式下永远返回 `true`（"默认都放过"），但在集群模式下有实际意义。它的 JavaDoc 说明了两种"链接不合法"的情形：

1. 一直连不上任何 canal server；
2. 当前客户端在 running 抢占中处于**备份节点**（非工作节点）。

集群模式按 `destination + clientId` 协调消费权。同一个消费身份只有一个活跃客户端，备用客户端要等到取得工作权后才能消费。

---

### 二、CanalServerWithEmbedded 数据服务

服务端 Netty 层只是"翻译官"，真正的数据逻辑全在 `CanalServerWithEmbedded`。它持有 `Map<String, CanalInstance> canalInstances`，每个方法都先根据 destination 找到对应 instance，再操作其 MetaManager 和 EventStore。

理解这一章的关键，是记住三个概念的关系（第 05 篇已详述，这里复习）：

- **cursor（消费位点）**：MetaManager 记录的"这个客户端已经确认消费到哪个 Binlog 位置"。ack 时前移。
- **batch（未确认批次）**：每次 get 会生成一个 batchId，记录"这批数据的位置范围"。ack 时移除，rollback 时清除。
- **EventStore（环形缓冲区）**：真正存数据的地方，有 put/get/ack 三个指针（第 04 篇）。

#### 2.1 subscribe() 完整流程

```java
@Override
public void subscribe(ClientIdentity clientIdentity) throws CanalServerException {
    checkStart(clientIdentity.getDestination());

    CanalInstance canalInstance = canalInstances.get(clientIdentity.getDestination());
    if (!canalInstance.getMetaManager().isStart()) {
        canalInstance.getMetaManager().start();
    }
    canalInstance.getMetaManager().subscribe(clientIdentity);        // ① meta 层登记订阅

    Position position = canalInstance.getMetaManager().getCursor(clientIdentity);
    if (position == null) {                                          // ② 没有历史 cursor
        position = canalInstance.getEventStore().getFirstPosition(); // 取 store 里最老一条
        if (position != null) {
            canalInstance.getMetaManager().updateCursor(clientIdentity, position); // 初始化 cursor
        }
        logger.info("subscribe successfully, {} with first position:{} ", clientIdentity, position);
    } else {
        logger.info("subscribe successfully, {} use last cursor position:{} ", clientIdentity, position);
    }

    canalInstance.subscribeChange(clientIdentity);                   // ③ 通知订阅关系变化（可能触发 filter 更新）
}
```

三步：

1. **meta 登记**：MetaManager 记录"这个 clientIdentity 订阅了"。
2. **cursor 初始化**：如果这个客户端从没消费过（cursor 为 null），就把消费起点设为 Store 里现存最老的数据（`getFirstPosition`）。这解释了接口 JavaDoc 里"第一次 fetch 从 canal 保存的最老一条数据开始"。如果有历史 cursor（重连场景），就沿用它——断点续传。
3. **通知变化**：`subscribeChange` 让 instance 感知订阅（比如 filter 变了需要通知 Parser）。

#### 2.2 getWithoutAck() 完整流程

```java
@Override
public Message getWithoutAck(ClientIdentity clientIdentity, int batchSize, Long timeout, TimeUnit unit)
                                                                        throws CanalServerException {
    checkStart(clientIdentity.getDestination());
    checkSubscribe(clientIdentity);                        // 必须先订阅

    CanalInstance canalInstance = canalInstances.get(clientIdentity.getDestination());
    synchronized (canalInstance) {                         // ★ 对 instance 加锁，保证 meta 与数据的顺序一致性
        PositionRange<LogPosition> positionRanges =
            canalInstance.getMetaManager().getLastestBatch(clientIdentity);  // 最近一批的位置

        Events<Event> events = null;
        if (positionRanges != null) {
            // 存在未处理完的流式批次：从上一批的起点重新取（幂等重发）
            events = getEvents(canalInstance.getEventStore(), positionRanges.getStart(), batchSize, timeout, unit);
        } else {
            // ack 后的第一次获取：从 cursor 取
            Position start = canalInstance.getMetaManager().getCursor(clientIdentity);
            if (start == null) {
                start = canalInstance.getEventStore().getFirstPosition();  // 还没 ack 过，取最老
            }
            events = getEvents(canalInstance.getEventStore(), start, batchSize, timeout, unit);
        }

        if (CollectionUtils.isEmpty(events.getEvents())) {
            return new Message(-1, true, new ArrayList()); // 空批次：batchId=-1，不生成新 batch
        } else {
            Long batchId = canalInstance.getMetaManager().addBatch(clientIdentity, events.getPositionRange()); // 生成 batchId
            boolean raw = isRaw(canalInstance.getEventStore());
            List entrys;
            if (raw) {
                entrys = events.getEvents().stream().map(Event::getRawEntry).collect(Collectors.toList());
            } else {
                entrys = events.getEvents().stream().map(Event::getEntry).collect(Collectors.toList());
            }
            return new Message(batchId, raw, entrys);
        }
    }
}
```

几个精髓：

- **`synchronized (canalInstance)`**：注释解释得很清楚——"meta 获取和数据的获取需要保证顺序性，优先拿到 meta 的一定也优先拿到数据"。如果不加锁，两个 get 并发可能出现"线程 A 拿到 meta 位置、线程 B 抢先拿走了数据"，导致顺序错乱。加锁保证了同一个 instance 的 get 严格串行。
- **两种起点**：如果 `getLastestBatch` 非空（上一批还没 ack/rollback），就从上一批**起点**重取——这实现了"没 ack 的批次会被重复投递"的幂等语义。如果为空（已 ack 或首次），从 cursor 取；cursor 也为空则从最老数据取。
- **空批次返回 -1**：没数据时返回 `Message(-1, ...)`，不调用 `addBatch`，避免"生成一个空 batchId 浪费性能"。客户端 `receiveMessages` 拿到 batchId=-1 就知道没数据。
- **raw 决定取字节还是取 Entry**：`isRaw` 判断 EventStore 是否是 raw 模式（`MemoryEventStoreWithBuffer.isRaw()`）。raw 时取 `getRawEntry()`（字节），非 raw 取 `getEntry()`（对象）。这与前面服务端 GET 序列化的 raw 分支呼应。
- **注意**：与 `get()` 不同，`getWithoutAck` 里**没有**在返回前调 `ack`。而 `get()` 里有一行 `ack(clientIdentity, batchId)`——这就是自动确认与手动确认在服务端的唯一区别。

#### 2.3 ack() 完整流程

```java
@Override
public void ack(ClientIdentity clientIdentity, long batchId) throws CanalServerException {
    checkStart(clientIdentity.getDestination());
    checkSubscribe(clientIdentity);

    CanalInstance canalInstance = canalInstances.get(clientIdentity.getDestination());
    PositionRange<LogPosition> positionRanges;
    positionRanges = canalInstance.getMetaManager().removeBatch(clientIdentity, batchId); // ① 移除该批次
    if (positionRanges == null) {
        throw new CanalServerException(String.format(
            "ack error , clientId:%s batchId:%d is not exist , please check",
            clientIdentity.getClientId(), batchId));   // 重复 ack 或非法 batchId
    }

    if (positionRanges.getAck() != null) {
        canalInstance.getMetaManager().updateCursor(clientIdentity, positionRanges.getAck()); // ② 前移 cursor
        logger.info("ack successfully, clientId:{} batchId:{} position:{}",
            clientIdentity.getClientId(), batchId, positionRanges);
    }

    canalInstance.getEventStore().ack(positionRanges.getEnd(), positionRanges.getEndSeq()); // ③ 释放 store 空间
}
```

三步，对应"确认"的完整语义：

1. **removeBatch**：从 MetaManager 移除这个 batchId 的记录。返回它的位置范围。如果返回 null，说明这个 batch 不存在（重复 ack、或 rollback 过了），抛异常。
2. **updateCursor**：把消费位点 cursor 前移到这批的**结束位置**（`getAck()`）。cursor 前移意味着"这批之前的数据都算确认了"——这也是接口 JavaDoc 说"小于等于此 batchId 的 Message 都会被确认"的实现。
3. **eventStore.ack**：通知环形缓冲区，这批数据占的空间可以回收了（ack 指针前移，腾出空间给 Parser 继续写入）。

#### 2.4 rollback() 完整流程

**全量回滚**：

```java
@Override
public void rollback(ClientIdentity clientIdentity) throws CanalServerException {
    checkStart(clientIdentity.getDestination());
    CanalInstance canalInstance = canalInstances.get(clientIdentity.getDestination());
    // 首次连接会自动 rollback，此时可能还没订阅，忽略之
    boolean hasSubscribe = canalInstance.getMetaManager().hasSubscribe(clientIdentity);
    if (!hasSubscribe) {
        return;
    }
    synchronized (canalInstance) {
        canalInstance.getMetaManager().clearAllBatchs(clientIdentity);  // ① 清除所有未 ack 批次
        canalInstance.getEventStore().rollback();                       // ② store get 指针回退到 ack 指针
        logger.info("rollback successfully, clientId:{}", clientIdentity.getClientId());
    }
}
```

**单批次回滚**：

```java
@Override
public void rollback(ClientIdentity clientIdentity, Long batchId) throws CanalServerException {
    checkStart(clientIdentity.getDestination());
    CanalInstance canalInstance = canalInstances.get(clientIdentity.getDestination());
    boolean hasSubscribe = canalInstance.getMetaManager().hasSubscribe(clientIdentity);
    if (!hasSubscribe) return;
    synchronized (canalInstance) {
        PositionRange<LogPosition> positionRanges =
            canalInstance.getMetaManager().removeBatch(clientIdentity, batchId);  // 移除指定批次
        if (positionRanges == null) {
            throw new CanalServerException(String.format(
                "rollback error, clientId:%s batchId:%d is not exist , please check",
                clientIdentity.getClientId(), batchId));
        }
        canalInstance.getEventStore().rollback();  // store 状态回退
        logger.info("rollback successfully, clientId:{} batchId:{} position:{}",
            clientIdentity.getClientId(), batchId, positionRanges);
    }
}
```

对比：

- 全量 rollback 调 `clearAllBatchs`（清空该客户端所有未 ack 批次），单批次调 `removeBatch`（只移一个）。
- 二者都调 `eventStore.rollback()`，把 Store 的 get 指针回退到 ack 指针位置——这样下次 get 会从"最后一次 ack 之后"重新读，重发未确认的数据。
- **`hasSubscribe` 判断很关键**：`rollbackOnConnect=true` 导致 connect 时会自动 rollback，但那一刻客户端可能还没发 SUBSCRIPTION 包（回顾 `SimpleCanalConnector.connect`：先 doConnect，再 subscribe，最后 rollback——实际顺序是 doConnect→subscribe→rollback，但认证阶段的顺带订阅路径可能让顺序不同）。用 `hasSubscribe` 兜底，未订阅时直接返回，避免异常。

#### 2.5 get() 的自动 ack

最后看一眼 `get()`（自动确认版）与 `getWithoutAck` 的差异，就在返回前多了一行：

```java
@Override
public Message get(ClientIdentity clientIdentity, int batchSize, Long timeout, TimeUnit unit)
                                                                        throws CanalServerException {
    checkStart(clientIdentity.getDestination());
    checkSubscribe(clientIdentity);
    CanalInstance canalInstance = canalInstances.get(clientIdentity.getDestination());
    synchronized (canalInstance) {
        PositionRange<LogPosition> positionRanges = canalInstance.getMetaManager().getLastestBatch(clientIdentity);
        if (positionRanges != null) {
            // get 模式下，如果上一批还没 ack，直接报错（可能丢数据）
            throw new CanalServerException(String.format(
                "clientId:%s has last batch:[%s] isn't ack , maybe loss data",
                clientIdentity.getClientId(), positionRanges));
        }
        ...
        Long batchId = canalInstance.getMetaManager().addBatch(clientIdentity, events.getPositionRange());
        ...
        ack(clientIdentity, batchId);   // ★ 拉完立即 ack
        return new Message(batchId, raw, entrys);
    }
}
```

注意 `get` 与 `getWithoutAck` 在"存在未 ack 批次"时的处理截然不同：

- `getWithoutAck`：存在未 ack 批次时，**重发**这批（幂等，配合 rollback 使用）。
- `get`：存在未 ack 批次时，**直接抛异常** "maybe loss data"。因为 get 是自动 ack 的，正常情况下不该有未 ack 批次；出现了说明状态异常，宁可报错也不冒险。

自动确认适合能容忍处理失败的场景。需从故障中回放时，使用手动确认，并验证下游去重与位点恢复。

---

## 作者

张鸿昊。本文摘自 RaftByJava 学习笔记。
