---
schemaVersion: 1
id: shardingsphere-jdbc-query-execution
title: "执行分组、连接管理与线程模型：物理 SQL 怎样真正发出去"
summary: "本篇从 ExecutionUnit 出发，追到真实 PreparedStatement.executeQuery 与 QueryResult。"
type: track
status: draft
authors: [zhang-honghao]
tags: ["Java", "数据库", "分库分表"]
publishedAt: 2026-11-25
updatedAt: 2026-11-25
cover: null
media: []
references:
  - kind: project
    title: "Apache ShardingSphere 源码基线"
    url: "https://github.com/apache/shardingsphere/tree/fa602445bea954884509d972fbdb2bed0adc0b92"
    source: "Apache ShardingSphere"
---

## 内容

> 本篇从 ExecutionUnit 出发，追到真实 PreparedStatement.executeQuery 与 QueryResult。
> 基线为 `fa602445bea954884509d972fbdb2bed0adc0b92`，主线为 JDBC 普通下推查询。

### 一、先看完整执行链

```text
DriverJDBCPushDownExecuteQueryExecutor.getQueryResults()
  → KernelProcessor.generateExecutionContext()
  → DriverExecutionPrepareEngine.prepare()
       → AbstractExecutionPrepareEngine.prepare()
            → 按 dataSourceName 聚合 ExecutionUnits
            → 按单次查询连接预算分组
            → 选择 ConnectionMode
            → DriverExecutionPrepareEngine.group()
                 → DriverDatabaseConnectionManager.getConnections()
                 → 每组绑定一条 Connection
                 → SQLExecutionUnitBuilder
                      → StatementManager.createStorageResource()
                      → 物理 PreparedStatement
                      → JDBCExecutionUnit
            → ExecutionPrepareDecorator
       → ExecutionGroupContext
  → 收集物理语句与参数
  → 回放参数和 Statement 属性
  → JDBCExecutor.execute()
       → ExecutorEngine.execute(serial = 是否已启动分布式事务)
            ├─ 串行：各组依次执行
            └─ 并行：首组当前线程执行，其余组线程池执行
                 → JDBCExecutorCallback.execute(group.inputs)
                      → 组内逐条执行 JDBCExecutionUnit
                      → 执行 Hook / 过程记录
                      → PreparedStatementExecuteQueryCallback
                           → 物理 PreparedStatement.executeQuery()
                           → JDBCStreamQueryResult / JDBCMemoryQueryResult
  → List<QueryResult>
  → 结果归并与逻辑 ResultSet
```

这里有五个不同数量：路由节点数、ExecutionUnit 数、ExecutionGroup 数、物理 Connection 数、真实查询调用数。
它们之间有关系，但不能直接画等号。

### 二、第一阶段：从 ExecutionUnit 到 JDBCExecutionUnit

ExecutionUnit 只有要去哪、执行什么 SQL、用什么参数，以及相关表映射等逻辑执行信息。
真正执行还需要 Connection、Statement 与 ConnectionMode。

源码：[DriverExecutionPrepareEngine](https://github.com/apache/shardingsphere/blob/fa602445bea954884509d972fbdb2bed0adc0b92/infra/executor/src/main/java/org/apache/shardingsphere/infra/executor/sql/prepare/driver/DriverExecutionPrepareEngine.java)。
它把通用执行单元交给匹配 JDBCDriverType 的 SQLExecutionUnitBuilder，连同 Connection、StatementManager、资源选项和数据库类型一起创建 JDBC 执行单元。

```text
ExecutionUnit
  ds_1
  SQLUnit(sql, params)
      + Connection
      + StatementManager 创建的物理 Statement
      + ConnectionMode
            ↓
JDBCExecutionUnit
```

只有到这个阶段，框架才具备直接调用驱动执行方法所需的资源。
不要把 KernelProcessor 生成 ExecutionContext 的返回当成数据库执行完成。

### 三、第二阶段：按数据源和连接预算分组

源码：[AbstractExecutionPrepareEngine](https://github.com/apache/shardingsphere/blob/fa602445bea954884509d972fbdb2bed0adc0b92/infra/executor/src/main/java/org/apache/shardingsphere/infra/executor/sql/prepare/AbstractExecutionPrepareEngine.java)。

prepare 首先按 ExecutionUnit.dataSourceName 分组。
对于一个数据源的 N 个单元，设配置 `max-connections-size-per-query` 为 M，它用如下分区大小：

```text
desiredPartitionSize = max(ceil(N / M), 1)
```

然后按此大小切分单元列表，每个切分组使用一条物理连接。
这是对源码整数除法的数学改写，不是原样 Java 代码。
配置应为有效正值，不能把该公式延伸到 M=0。

#### 3.1 这个限制到底限制什么

它限制一次查询在每个数据源上的连接分组规模，不是整个 JVM 的数据库连接池最大值，也不是线程池大小。
不同数据源分别计算，所以“两数据源，每源预算 2”不能解释为本次最多只用 2 条物理连接。

本版本默认值为 1，可对照 [ConfigurationPropertyKey](https://github.com/apache/shardingsphere/blob/fa602445bea954884509d972fbdb2bed0adc0b92/infra/common/src/main/java/org/apache/shardingsphere/infra/config/props/ConfigurationPropertyKey.java)。
默认值是当前版本事实，不是为任何负载推荐的最优值。

#### 3.2 五个执行单元的例子

以下假设前面的 UNION ALL 聚合没有减少单元数，也没有装饰器改变分组：

| N | M | 分组 | 每数据源申请的组连接数 | 模式 |
|---:|---:|---|---:|---|
| 5 | 1 | `[5]` | 1 | CONNECTION_STRICTLY |
| 5 | 2 | `[3,2]` | 2 | CONNECTION_STRICTLY |
| 5 | 3 | `[2,2,1]` | 3 | CONNECTION_STRICTLY |
| 5 | 5 | `[1,1,1,1,1]` | 5 | MEMORY_STRICTLY |
| 5 | 10 | `[1,1,1,1,1]` | 5 | MEMORY_STRICTLY |

M 是预算，不是要求一定创建 M 条连接。
最终可用连接还受缓存、事务和连接池状况影响。

### 四、第三阶段：ConnectionMode 为什么影响结果内存

源码：[ConnectionMode](https://github.com/apache/shardingsphere/blob/fa602445bea954884509d972fbdb2bed0adc0b92/infra/executor/src/main/java/org/apache/shardingsphere/infra/executor/sql/execute/engine/ConnectionMode.java)。

prepare 里的选择条件是：

```java
// 源码中的原样语句
ConnectionMode connectionMode = maxConnectionsSizePerQuery < groupedExecutionUnits.size() ? ConnectionMode.CONNECTION_STRICTLY : ConnectionMode.MEMORY_STRICTLY;
```

#### 4.1 MEMORY_STRICTLY：用更多连接支持逐步消费

当预算足以给每个执行单元独立分组时，可返回 JDBCStreamQueryResult。
这使框架不必在该 QueryResult 包装阶段将所有结果行完整加载成内存行集合。

它并不保证零内存占用：数据库 JDBC 驱动本身可能缓冲数据，fetchSize 和驱动参数影响实际行为，归并算法也有自身状态。
所以“Stream”是框架层结果接口的行为选择，不能仅据名字声称数据库到客户端全链路都严格流式。

#### 4.2 CONNECTION_STRICTLY：同连接上的前一结果需要被完整保存

连接预算小于 SQL 数时，同一 ExecutionGroup 中有多条 SQL 共用一条连接，并依次执行。
前一条结果如果还依赖同一连接上的活动 ResultSet，执行下一条语句可能干扰它。
因此普通查询回调将结果包装为 JDBCMemoryQueryResult，先把数据加载进框架内存，再继续处理组内后面的 SQL。

源码：[ExecuteQueryCallback](https://github.com/apache/shardingsphere/blob/fa602445bea954884509d972fbdb2bed0adc0b92/jdbc/src/main/java/org/apache/shardingsphere/driver/executor/callback/execute/ExecuteQueryCallback.java)。
原样方法摘录：

```java
protected final QueryResult executeSQL(final String sql, final Statement statement, final ConnectionMode connectionMode, final DatabaseType storageType) throws SQLException {
    ResultSet resultSet = executeQuery(sql, statement);
    return ConnectionMode.MEMORY_STRICTLY == connectionMode ? new JDBCStreamQueryResult(resultSet, true) : new JDBCMemoryQueryResult(resultSet, storageType, true);
}
```

[JDBCMemoryQueryResult](https://github.com/apache/shardingsphere/blob/fa602445bea954884509d972fbdb2bed0adc0b92/infra/executor/src/main/java/org/apache/shardingsphere/infra/executor/sql/execute/result/query/impl/driver/jdbc/type/memory/JDBCMemoryQueryResult.java) 构造时通过 QueryResultDataRowLoader.load 读取行。
这不是“给同一个物理 ResultSet 换了个名字”，而是产生真实的数据加载成本。

#### 4.3 连接和内存是交换关系

| 选择 | 可能得到的收益 | 需要承担的成本 |
|---|---|---|
| 更少物理连接 | 减小连接池压力 | 组内串行、更多结果内存化 |
| 更多物理连接 | 更多组可并发，适用流式结果 | 数据库连接占用增加，后端并发压力更大 |

配置调优应同时看结果量、连接池、数据库负载和并发请求数量。
只把连接预算调大，不能证明整体吞吐一定提高。

### 五、第四阶段：逻辑连接怎样取得物理连接

源码：[DriverDatabaseConnectionManager](https://github.com/apache/shardingsphere/blob/fa602445bea954884509d972fbdb2bed0adc0b92/jdbc/src/main/java/org/apache/shardingsphere/driver/jdbc/core/connection/DriverDatabaseConnectionManager.java)。

getConnections0 用逻辑数据库名与数据源名生成缓存 key，再查看已有连接集合。
目标范围由 connectionOffset 和 connectionSize 确定。

```text
缓存连接足够
  → 从已有连接列表取指定区间

没有缓存连接
  → 创建 offset+size 所需的连接
  → 缓存并返回所需区间

缓存连接不够
  → 保留已有连接
  → 创建缺少部分
  → 合并、缓存、返回
```

这里的缓存属于该逻辑连接的管理器，不是全局连接池。
真正 DataSource.getConnection 的实现可能再从连接池借出底层连接，形成另一层资源复用。

#### 5.1 事务连接优先

createConnection 首先询问 ConnectionTransaction 是否已有适用的事务连接。
有则直接使用；否则调用下游 DataSource.getConnection。
所以普通分组的连接数演算，还需要结合事务连接的获取和复用逻辑理解。

#### 5.2 为什么记录连接方法调用

应用可能在物理连接创建之前就调用 setAutoCommit、setReadOnly、setTransactionIsolation 等逻辑连接方法。
管理器用对应的调用记录器，在真正取到连接后回放适用状态。
这与 PreparedStatement 参数回放类似，但记录内容和生命期不同。

若状态回放抛 SQLException，代码关闭刚取得的连接后重新抛出，避免把未完成初始化的连接继续使用。
批量创建多条连接失败时，也会尝试关闭本轮已经创建的连接并报告 OverallConnectionNotEnoughException。

#### 5.3 动态资源变化为什么要考虑事务

getDataSource 会根据当前数据库和事务是否启动选择资源来源。
在允许切换的路径中，如果 ContextManager 中的 DataSource 已变化，会关闭相关缓存连接并更新引用。
事务中的路径则有不同处理，不能把“规则或资源改了”解释成正在进行的事务一定立刻换连接。
治理篇会再从配置变更侧说明这一生命周期。

### 六、第五阶段：StatementManager 创建真实 Statement

源码：[StatementManager](https://github.com/apache/shardingsphere/blob/fa602445bea954884509d972fbdb2bed0adc0b92/jdbc/src/main/java/org/apache/shardingsphere/driver/jdbc/core/statement/StatementManager.java)。

它使用 ExecutionUnit、ConnectionMode 与 connectionOffset 形成缓存 key。
没有缓存，或者缓存 Statement/Connection 已关闭时，调用真实 Connection.prepareStatement。
StatementOption 决定是否请求自动生成键、指定列名，以及 ResultSet 类型、并发与 holdability。

对驱动不支持部分 prepareStatement 重载的情况，代码捕获 SQLFeatureNotSupportedException，再使用基本 prepareStatement(sql)。
这条降级路径解决的是驱动 API 能力，不代表自动补齐原本不支持的结果集语义。

创建 Statement 后还需要回放：

1. 该物理 SQL 对应的参数。
2. 逻辑 Statement 上记录的适用属性方法。

当前参数适配器使用 setObject 逐值设置实际参数，不能误讲成一定原样调用物理 setLong、setInt。

### 七、第六阶段：ExecutorEngine 怎么并行

源码：[JDBCExecutor](https://github.com/apache/shardingsphere/blob/fa602445bea954884509d972fbdb2bed0adc0b92/infra/executor/src/main/java/org/apache/shardingsphere/infra/executor/sql/execute/engine/driver/jdbc/JDBCExecutor.java)、[ExecutorEngine](https://github.com/apache/shardingsphere/blob/fa602445bea954884509d972fbdb2bed0adc0b92/infra/executor/src/main/java/org/apache/shardingsphere/infra/executor/kernel/ExecutorEngine.java)。

JDBCExecutor 将 ExecutionGroupContext 交给 ExecutorEngine，并传入 ConnectionContext 中“分布式事务是否已启动”的布尔值作为 serial 参数。
因此本条调用路径会因分布式事务状态而选择串行或并行，不能说所有分片 SQL 都开线程池并发执行。

#### 7.1 并行路径不是全部丢给线程池

parallelExecute 取第一个组，先把剩余组提交到线程池，再在当前线程同步执行首组，最后读取 Futures 收集结果。

```text
调用线程                       线程池工作线程
  │                               │
  ├─ 提交组2、组3 ────────────────→│ 组2 / 组3
  │                               │
  ├─ 同步执行组1                  │ 同时执行其他组
  │                               │
  └─ 依次取得 Future 结果 ←────────┘
```

首组使用当前线程可以避免调用者空等时完全闲置，也允许 firstCallback 具有特殊处理。
“首组”依据已经形成的组顺序，不等于配置文件里用户认为的第一个库。

#### 7.2 同一组内部仍然逐条执行

[JDBCExecutorCallback](https://github.com/apache/shardingsphere/blob/fa602445bea954884509d972fbdb2bed0adc0b92/infra/executor/src/main/java/org/apache/shardingsphere/infra/executor/sql/execute/engine/driver/jdbc/JDBCExecutorCallback.java) 的 execute(Collection) 遍历 JDBCExecutionUnits，逐个调用私有 execute。
组之间能并发，不意味着同一连接上的组内 SQL 并发。
这个区别是连接预算影响延迟的直接原因。

#### 7.3 线程池大小和连接预算不同

[ExecutorServiceManager](https://github.com/apache/shardingsphere/blob/fa602445bea954884509d972fbdb2bed0adc0b92/infra/executor/src/main/java/org/apache/shardingsphere/infra/executor/kernel/thread/ExecutorServiceManager.java) 在 executorSize 为 0 时创建 cached thread pool，非 0 时创建 fixed thread pool，并用 TtlExecutors 包装。
相关配置键是 kernel-executor-size。
不要把 0 解释为“没有线程”或“所有任务都串行”。

线程上下文传播也不意味着任何自定义 ThreadLocal 都可以无条件跨线程复用。
调试事务、Hint 和观测信息时，必须具体核对相应上下文的携带机制。

### 八、第七阶段：物理执行与 Hook

JDBCExecutorCallback 在每个单元执行前创建 SPISQLExecutionHook，传入数据源名、SQL、参数、连接属性和是否主线程等信息。
执行成功后通知 Hook 并更新过程状态，失败则通知 finishFailure。

PreparedStatement 路径最终到达 [PreparedStatementExecuteQueryCallback](https://github.com/apache/shardingsphere/blob/fa602445bea954884509d972fbdb2bed0adc0b92/jdbc/src/main/java/org/apache/shardingsphere/driver/executor/callback/execute/impl/PreparedStatementExecuteQueryCallback.java)：

```java
// 原样方法摘录
protected ResultSet executeQuery(final String sql, final Statement statement) throws SQLException {
    return ((PreparedStatement) statement).executeQuery();
}
```

这里传入 sql 但不再调用 executeQuery(sql)，因为物理 PreparedStatement 在 prepare 阶段已经绑定了物理 SQL，参数也已经回放。
同一个回调接口还服务 Statement 路径，不能据此认为 sql 参数没有用途或可以随意删除。

数据库返回物理 ResultSet 后，再按 ConnectionMode 包装成 QueryResult。
这个 QueryResult 是归并层的输入，不是最终应用级 ResultSet。

### 九、异常处理不能只看一个 catch

ExecutorEngine 收集异步结果时处理 InterruptedException 和 ExecutionException。
中断会恢复线程中断标记；异常原因若为 SQLException，则保留相应 SQL 异常，否则包装未知 SQL 异常。

[SQLExecutorExceptionHandler](https://github.com/apache/shardingsphere/blob/fa602445bea954884509d972fbdb2bed0adc0b92/infra/executor/src/main/java/org/apache/shardingsphere/infra/executor/sql/execute/engine/SQLExecutorExceptionHandler.java) 用 ThreadLocal 控制执行异常是抛出还是记录日志，默认初始化为 true。
JDBCExecutorCallback 每次执行设置对应值，handleException 在处理后移除该 ThreadLocal 值。
因此不能仅看到某个方法 catch SQLException 后返回 emptyList，就断言所有数据库异常被吞掉；handleException 可能已经抛出。

同样不能反过来说“所有错误一定立刻终止其他分片”。
异步任务可能已经提交甚至完成，当前代码的异常传播也不等于取消全部 Futures 或自动回滚所有已提交工作。
写操作的原子性必须放到事务协议中讨论，执行器的并发不是分布式事务保障。

### 十、资源关闭的层次

| 资源 | 主要管理位置 | 不应混淆的动作 |
|---|---|---|
| 框架执行过程记录 | ProcessEngine | completeSQLExecution 不等于关闭连接 |
| 逻辑与物理 ResultSet | ResultSet 包装与对应物理 Statement | 返回结果对象不等于已经消费全部行 |
| 物理 Statement 集合 | StatementManager | 清空逻辑参数不等于关闭 Statement |
| 该逻辑连接缓存的物理连接 | DriverDatabaseConnectionManager | Statement 执行完成不等于连接立刻归还池 |
| 下游 DataSource 与全局上下文 | ShardingSphereDataSource | 不应每个查询结束都关闭整个 DataSource |

ShardingSphereConnection.close 处理分布式事务回滚的适用情形、标记关闭并断开过程信息，尝试关闭注册的 StatementManagers，最后在 finally 清理连接管理器。
StatementManager.close 也使用 finally 清除自身缓存。
这说明框架按层回收资源，但不构成“任何异常时零泄漏”的未经验证保证；要判断具体失败场景仍需检查对应路径和测试。

### 十一、怎样推导延迟与资源，而不是凭线程数猜

在没有事务串行和其他装饰行为时，组内延迟大致是顺序执行 SQL 的耗时之和，组间完成时间由慢组和线程池调度共同影响。
这只是分析模型，不是精确性能公式：取连接、驱动缓冲、网络、数据库锁、归并与结果消费都可能额外耗时。

优先记录：

1. 改写后每数据源的 ExecutionUnit 数。
2. 本次每数据源实际分组数量与 ConnectionMode。
3. 连接池等待时间与借出数量。
4. 串行/并行分支和线程池排队。
5. 每条实际 SQL 的执行时间、返回行数与读取耗时。
6. 内存型结果累计大小以及归并阶段时间。

只有这些信息对应起来，才有依据判断该调整连接预算、线程池、SQL、索引还是分片规则。

### 十二、源码阅读与验证入口

断点顺序：

```text
AbstractExecutionPrepareEngine.prepare
  → group(List<ExecutionUnit>)
  → DriverExecutionPrepareEngine.group
  → DriverDatabaseConnectionManager.getConnections0
  → StatementManager.createStorageResource
  → 上层参数 replay
  → JDBCExecutor.execute
  → ExecutorEngine.serialExecute / parallelExecute
  → JDBCExecutorCallback.execute
  → PreparedStatementExecuteQueryCallback.executeQuery
  → ExecuteQueryCallback.executeSQL
```

已有 [ExecutorEngineTest](https://github.com/apache/shardingsphere/blob/fa602445bea954884509d972fbdb2bed0adc0b92/infra/executor/src/test/java/org/apache/shardingsphere/infra/executor/kernel/ExecutorEngineTest.java) 与 [JDBCExecutorTest](https://github.com/apache/shardingsphere/blob/fa602445bea954884509d972fbdb2bed0adc0b92/infra/executor/src/test/java/org/apache/shardingsphere/infra/executor/sql/execute/engine/driver/jdbc/JDBCExecutorTest.java) 可帮助理解分组与回调契约。
本次没有运行这些测试，也没有测量连接数或性能。
后续运行验证应明确关闭前一篇提到的 UNION ALL 优化或核对实际单元数，避免输入条件已经变化却仍按预期表数推导连接数。

### 十三、完整回顾

```text
ExecutionUnit：知道 SQL 去哪，但没有真实执行资源
  → 按数据源分组
  → 按连接预算切分执行组
  → 选连接 / 内存权衡模式
  → 取得事务或池连接，回放连接状态
  → 创建或复用物理 Statement
  → 回放物理参数和语句属性
  → 串行或组间并行，组内逐条执行
  → 真实驱动 executeQuery
  → Stream / Memory QueryResult
  → 下一阶段：全局归并与逻辑 ResultSet
```

执行引擎的核心工作是把“可执行的描述”变成“受资源和事务约束的真实执行”，并把结果以合适的生命期交给后续层。

## 作者

张鸿昊。本文来源于 RaftByJava 学习笔记。
