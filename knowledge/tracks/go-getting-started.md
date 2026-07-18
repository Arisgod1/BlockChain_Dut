---
schemaVersion: 1
id: go-getting-started
title: Go 入门
summary: 从安装、模块初始化、基础语法到第一个 HTTP 服务，建立可继续学习 Go 后端开发的最小路径。
type: track
status: published
authors: [ma-yuhao]
tags: [Go, 后端, 入门, HTTP]
publishedAt: 2026-07-18
updatedAt: 2026-07-18
cover: null
media: []
references:
  - kind: document
    title: Go 官方文档
    url: https://go.dev/doc/
    source: The Go Project
  - kind: guide
    title: A Tour of Go
    url: https://go.dev/tour/
    source: The Go Project
---

## 内容

### 准备环境

从 Go 官方网站安装当前稳定版本，然后确认工具链：

```bash
go version
mkdir hello-go && cd hello-go
go mod init example.com/hello-go
```

`go.mod` 记录模块路径和依赖版本，是 Go 项目的基础文件。

### 第一个程序

创建 `main.go`：

```go
package main

import "fmt"

func main() {
    message := "Hello, Go"
    fmt.Println(message)
}
```

使用 `go run .` 直接运行，使用 `go build .` 构建可执行文件。提交前可以运行 `gofmt -w .` 统一格式。

### 必备语法

入门阶段优先掌握变量、函数、结构体、切片、映射、接口和错误处理。Go 通常通过返回值显式传递错误：

```go
value, err := doWork()
if err != nil {
    return err
}
```

### 第一个 HTTP 服务

标准库已经提供基础 HTTP 能力：

```go
package main

import (
    "fmt"
    "net/http"
)

func main() {
    http.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
        fmt.Fprintln(w, "ok")
    })
    http.ListenAndServe(":8080", nil)
}
```

运行后在本机访问 `/health` 路径。下一步可以继续学习 JSON 编解码、测试、数据库访问、并发和服务部署。

## 作者

- [马玉灏](/members/ma-yuhao/)
