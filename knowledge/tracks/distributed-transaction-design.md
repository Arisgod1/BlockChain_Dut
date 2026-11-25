---
schemaVersion: 1
id: distributed-transaction-design
title: "分布式事务"
summary: "在微服务架构下，原本在一个服务内闭环的简单操作变成了需要多个不同服务协作完成的复杂操作。"
type: track
status: draft
authors: [zhang-honghao]
tags: ["分布式系统", "数据库", "分布式事务"]
publishedAt: 2026-11-25
updatedAt: 2026-11-25
cover: null
media: []
references:
  - kind: document
    title: "Seata Transaction Modes"
    url: "https://seata.apache.org/docs/overview/what-is-seata/"
    source: "Apache Seata"
  - kind: document
    title: "Transactional Outbox"
    url: "https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html"
    source: "AWS"
---

## 内容

### 二、整体架构设计

#### 2.1 核心概念与角色

分布式事务框架中涉及以下核心概念：

| 名词 | 概念 |
| --- | --- |
| 事务管理器（Transaction Manager） | 在业务调用侧划定全局事务边界，向协调器发起开始、提交或回滚请求 |
| 资源管理器（Resource Manager） | 管理分支事务所涉及的资源，向协调器注册分支并执行分支提交或回滚 |
| 事务协调器（Transaction Coordinator） | 独立模块，控制事务提交和回滚操作，可嵌入客户端或作为独立服务部署 |
| 全局事务（Global Transaction） | 逻辑概念，包含多个分支事务，发起方通过修改全局事务状态控制分支事务的提交/回滚 |
| 分支事务（Branch Transaction） | 逻辑概念，一个分布式事务可能包含多个数据库本地事务 |
| 事务发起方（Launcher） | 发起分布式事务的一方，有且仅有一个，决定整个事务提交或回滚 |
| 事务参与方（Participant） | 提供分支事务服务，被发起方调用后纳入分布式事务，可以有多个 |

#### 2.2 解决方案全景

分布式事务解决方案按一致性要求和适用场景可分为以下几类：

```
┌─────────────────────────────────────────────────────────┐
│                  分布式事务解决方案                        │
├──────────────┬──────────────┬──────────────┬────────────┤
│   2PC/XA     │     TCC      │    Saga      │  可靠消息   │
│  (强一致性)   │ (最终一致性)  │ (最终一致性)  │ (最终一致性) │
├──────────────┼──────────────┼──────────────┼────────────┤
│ 数据库层面控制 │ 业务层面控制  │ 长流程补偿    │ 异步解耦    │
│ 代码无侵入    │ 代码侵入高    │ 代码侵入中    │ 代码侵入低  │
│ 性能差       │ 性能好        │ 性能好        │ 性能好      │
│ 适用面窄     │ 适用面广      │ 长流程场景    │ 异步场景    │
└──────────────┴──────────────┴──────────────┴────────────┘
```

#### 2.3 方案对比

| 方案 | 一致性 | 隔离性 | 并发 | 业务成本 | 技术成本 | 代码侵入 | 适用场景 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2PC（XA 协议） | 原子提交 | 由参与资源和隔离级别决定 | prepare 后可能保留资源，协调者故障期间可能阻塞 | 低 | 需 XA 资源和协调器 | 较低 | 要求跨资源原子提交的流程 |
| TCC | 最终一致性 | Try保障隔离 | 高并发 | 高 | 高 | 高 | 各种同步场景 |
| Saga | 最终一致性 | 差 | 高并发，状态驱动 | 中低 | 高 | 中 | 流程节点多且长 |
| 可靠消息 | 最终一致性 | 由各本地事务决定 | 高并发 | 低 | 高 | 低 | 下游结果不影响上游的异步流程 |
| 最大努力通知 | 有限重试，需配合查询或对账 | 由各本地事务决定 | 高并发 | 低 | 基本无 | 低 | 业务执行结果通知 |

---

### 四、异常处理

#### 4.1 幂等性设计

分布式事务下，方案涉及流程重试、业务补偿以及业务隔离，要求在设计开发相关业务操作时必须考虑操作的**可查询**和**幂等**。

幂等指的是针对一个操作，任意多次执行产生的业务影响和一次执行产生的业务影响相同。实现上有两种思路：

- **通过业务逻辑实现幂等性**：如创建订单，如果对应订单之前已创建成功则返回创建成功的订单信息
- **存储所有请求和结果**：检测到重复请求后直接返回之前处理的结果

```java
// 幂等性设计的通用方案
public abstract class IdempotentService<T, R> {

    @Autowired
    protected RedisTemplate<String, String> redisTemplate;

    public R executeIdempotent(String requestId, Supplier<T> requestSupplier,
                                Function<T, R> businessFunction) {
        // 1. 尝试获取分布式锁
        String lockKey = "idempotent:" + requestId;
        Boolean locked = redisTemplate.opsForValue()
            .setIfAbsent(lockKey, "PROCESSING", 30, TimeUnit.SECONDS);

        if (locked == null || !locked) {
            // 2. 锁获取失败，说明已有请求在处理中或已处理完成
            String status = redisTemplate.opsForValue().get(lockKey);
            if ("COMPLETED".equals(status)) {
                // 已处理完成，返回缓存结果
                String cachedResult = redisTemplate.opsForValue()
                    .get(lockKey + ":result");
                return JSON.parseObject(cachedResult, getResultType());
            }
            // 处理中，返回处理中状态
            throw new BusinessException("请求处理中，请稍后重试");
        }

        try {
            // 3. 执行业务逻辑
            T request = requestSupplier.get();
            R result = businessFunction.apply(request);

            // 4. 缓存结果
            redisTemplate.opsForValue()
                .set(lockKey, "COMPLETED", 24, TimeUnit.HOURS);
            redisTemplate.opsForValue()
                .set(lockKey + ":result", JSON.toJSONString(result),
                    24, TimeUnit.HOURS);

            return result;
        } catch (Exception e) {
            // 5. 异常时删除锁，允许重试
            redisTemplate.delete(lockKey);
            throw e;
        }
    }

    protected abstract Class<R> getResultType();
}
```

#### 4.2 可查询设计

一次业务操作应具备一个全局唯一标识，便于查询和补偿：

- 业务的单据凭证号（订单号）
- 系统分配的流水号
- 对操作资源的组合（商户编号 + 用户编号）

#### 4.3 补偿与重试机制

```java
// 重试机制设计
public class RetryTemplate {

    public <T> T executeWithRetry(Callable<T> task, RetryPolicy policy) {
        int attempt = 0;
        Exception lastException = null;

        while (attempt < policy.getMaxAttempts()) {
            try {
                return task.call();
            } catch (Exception e) {
                lastException = e;
                attempt++;
                if (attempt >= policy.getMaxAttempts()) {
                    break;
                }
                // 指数退避
                long delay = calculateDelay(attempt, policy);
                try {
                    Thread.sleep(delay);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("重试被中断", ie);
                }
            }
        }
        throw new RuntimeException("重试次数耗尽", lastException);
    }

    private long calculateDelay(int attempt, RetryPolicy policy) {
        // 指数退避 + 随机抖动
        long baseDelay = policy.getInitialInterval();
        long maxDelay = policy.getMaxInterval();
        long delay = (long) (baseDelay * Math.pow(policy.getMultiplier(), attempt - 1));
        delay = Math.min(delay, maxDelay);
        // 添加抖动，避免重试风暴
        delay = delay + (long) (Math.random() * delay * 0.1);
        return delay;
    }
}
```

#### 4.4 异常场景处理矩阵

| 异常场景 | TCC处理方式 | Saga处理方式 | 可靠消息处理方式 |
| --- | --- | --- | --- |
| 网络超时 | 重试Confirm/Cancel（需幂等） | 重试Do操作或触发Compensate | 消息重投递（需消费端幂等） |
| 参与者宕机 | 协调器记录状态，参与者恢复后重试 | 协调器记录进度，恢复后继续或补偿 | MQ持久化，消费者恢复后消费 |
| 协调器宕机 | 集群选举新协调器，读取日志恢复 | 集群选举新协调器，读取日志恢复 | MQ Broker集群高可用 |
| 空回滚 | 生成回滚记录拒绝后续Try | N/A | N/A |
| 事务悬挂 | Try前检查回滚记录 | N/A | N/A |
| 消息丢失 | N/A | N/A | 定时扫描重发 / 事务回查 |

---

### 六、最佳实践

#### 6.1 方案选型指南

1. **同步交易场景**：业务能定义资源预留、确认与取消时，可以考虑 TCC。跨资源原子提交和隔离要求需独立评估。
2. **长流程业务场景**：选择Saga。适合业务流程长、参与者多的场景，如旅行预订、订单履约等。
3. **异步解耦场景**：选择可靠消息。适合下游结果不影响上游执行的异步流程，如消费送积分、消费送券。
4. **通知场景**：选择最大努力通知。适合业务执行结果的通知，对实时性要求不高的场景。
5. **低改造成本场景**：选择AT模式。选择前应核对数据库类型、SQL 兼容性、全局锁及回滚限制。

#### 6.2 设计原则

**避免大事务**：将大事务拆分为小事务加异步化，减少资源锁定时间。

**确保幂等性**：所有可能被重试的接口（Confirm、Cancel、Compensate、消息消费）必须实现幂等。

**保证可查询**：每次业务操作应有全局唯一标识，便于状态查询和补偿。

**设计补偿优先于回滚**：在分布式场景下，补偿比回滚更实用。补偿是"逻辑撤销"，一次真实操作用于撤销之前操作的影响，而回滚只能取消未提交的事务。

**合理设置超时**：各环节设置合理的超时时间，避免无限等待导致资源耗尽。

#### 6.3 监控与运维

```java
// 分布式事务监控指标采集
@Component
public class TransactionMetrics {

    private final MeterRegistry meterRegistry;
    private final Counter txStartedCounter;
    private final Counter txCommittedCounter;
    private final Counter txRolledBackCounter;
    private final Counter txTimeoutCounter;
    private final Timer txDurationTimer;

    public TransactionMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.txStartedCounter = Counter.builder("distributed.tx.started")
            .description("分布式事务启动数")
            .register(meterRegistry);
        this.txCommittedCounter = Counter.builder("distributed.tx.committed")
            .description("分布式事务提交数")
            .register(meterRegistry);
        this.txRolledBackCounter = Counter.builder("distributed.tx.rolledback")
            .description("分布式事务回滚数")
            .register(meterRegistry);
        this.txTimeoutCounter = Counter.builder("distributed.tx.timeout")
            .description("分布式事务超时数")
            .register(meterRegistry);
        this.txDurationTimer = Timer.builder("distributed.tx.duration")
            .description("分布式事务执行耗时")
            .register(meterRegistry);
    }

    public void recordTransactionStart(String txType) {
        txStartedCounter.increment();
        meterRegistry.counter("distributed.tx.started",
            "type", txType).increment();
    }

    public void recordTransactionCommit(String txType, long durationMs) {
        txCommittedCounter.increment();
        txDurationTimer.record(durationMs, TimeUnit.MILLISECONDS);
    }

    public void recordTransactionRollback(String txType, String reason) {
        txRolledBackCounter.increment();
        meterRegistry.counter("distributed.tx.rolledback",
            "type", txType, "reason", reason).increment();
    }
}
```

#### 6.4 常见踩坑总结

**坑1：TCC的Confirm/Cancel忘记做幂等**
框架在超时后会重试Confirm/Cancel操作，如果不做幂等，可能导致重复扣款或重复入账。

**坑2：Saga的补偿操作不可逆**
补偿操作本身也可能失败，需要设计重试机制和最终兜底的告警人工介入流程。

**坑3：可靠消息的消费端未处理幂等**
消息可能被重复投递，消费端必须通过唯一标识判断是否已处理。

**坑4：AT模式的脏写问题**
AT模式在一阶段提交后、二阶段回滚前，如果其他全局事务修改了同一行数据，会导致回滚时数据不一致。框架通过全局锁来避免，但需要确保所有数据访问都经过框架代理。

**坑5：事务悬挂导致资源泄漏**
TCC模式下，Cancel先于Try到达时如果处理不当，Try操作预留的资源将永远无法释放。必须在Try操作前检查是否已有Cancel记录。

**坑6：忽略网络分区的影响**
在网络分区场景下，协调者可能认为参与者已宕机而发起回滚，但参与者实际仍在执行Try操作。需要通过超时机制和状态检查来处理这种场景。

#### 6.5 演进路线

分布式事务的引入应循序渐进：

1. **第一阶段**：优先使用可靠消息方案处理异步场景，这是成本最低的方案
2. **第二阶段**：对需要显式资源预留的同步链路评估 TCC，验证确认、撤销和业务隔离
3. **第三阶段**：对复杂长流程引入Saga，处理多步骤补偿
4. **第四阶段**：建设统一的分布式事务平台，支持多模式接入，提供监控告警和自动化补偿能力

---

## 作者

张鸿昊。本文摘自 DistributedPaperLearnNotes 学习笔记。
