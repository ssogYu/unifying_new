### 代码核心逻辑

    1. 累积数据到 buffer
    2. 流结束时的处理

边界数据处理

```json 正常多块数据
    服务器发送:
        chunk1: "data: hello\ndata: world\n"

    处理过程:
        buffer = "data: hello\ndata: world\n"
        lines = ["data: hello", "data: world", ""] // split 产生空元素
        buffer = "" (pop 后)

        处理: "data: hello" → onMessage("hello")
        处理: "data: world" → onMessage("world")
```

```json 跨块传输的完整行
服务器发送:
  chunk1: "data: hel"
  chunk2: "lo\ndata: world\n"
chunk1 处理:
  buffer = "data: hel"
  lines = ["data: hel"]  ← 没有 \n，整行保留
  buffer = "data: hel"
  处理: [] (无完整行)
chunk2 处理:
  buffer = "data: hel" + "lo\ndata: world\n" = "data: hello\ndata: world\n"
  lines = ["data: hello", "data: world", ""]
  buffer = ""

  处理: "data: hello" → onMessage("hello")
  处理: "data: world" → onMessage("world")
```

```json 流结束时残留不完整数据
服务器发送:
  chunk1: "data: hello\ndata: wor"  ← 最后一块不完整
  (流结束)

处理:
  buffer = "data: hello\ndata: wor"
  lines = ["data: hello", "data: wor"]
  buffer = "data: wor"  ← 残留

  处理: "data: hello" → onMessage("hello")

流结束时:
  buffer.trim() = "data: wor" (truthy)
  → processBuffer("data: wor")
  → onMessage("wor")
```

### 不同 AI 接口的返回格式

OpenAI GPT {"choices":[{"delta":{"content":"你好"}}]} 第 2 个判断 Claude {"content":"你好"} 第 3 个判断
Kimi {"choices":[{"delta":{"content":"你好"}}]} 第 2 个判断
通义千问 {"content":"你好"} 第 3 个判断
错误返回 {"error":"服务不可用"} 第 1 个判断
非 JSON data: plain text catch 分支

```javascript
try {
  const parsed = JSON.parse(data);
  if (parsed.error) {
    onMessage?.(
      typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error),
      true
    );
  } else if (parsed.choices?.[0]?.delta?.content) {
    onMessage?.(parsed.choices[0].delta.content);
  } else if (parsed.content) {
    onMessage?.(parsed.content);
  } else {
    onMessage?.(data);
  }
} catch {
  onMessage?.(data);
}
```
