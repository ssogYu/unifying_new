/**
 * 流行的 AI 模型厂商
 */
export type AIModelProvider = 'openai' | 'anthropic' | 'google' | 'azure' | 'kimi' | 'qwen' | 'deepseek' | 'grok' | 'custom';

/**
 * 流式请求配置选项
 */
export interface StreamRequestOptions extends RequestInit {
  /** HTTP 请求方法（默认：POST） */
  method?: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH';
  /** 模型厂商名称 */
  model?: AIModelProvider;
  /** HTTP 请求头 */
  headers?: Record<string, string>;
  /** 请求体 */
  body?: BodyInit;
  /** 每次从流中接收到消息时的回调函数 */
  onMessage?: (data: string, isError?: boolean) => void;
  /** 流开始时的回调函数 */
  onStart?: () => void;
  /** 流结束时的回调函数 */
  onEnd?: () => void;
  /** 请求错误时的回调函数 */
  onError?: (error: Error) => void;
  /** 自定义行解析函数，返回 null 则跳过该行 */
  parseLine?: (line: string) => string | null;
  /** 请求超时时间（毫秒，默认：60000） */
  timeout?: number;
}

/**
 * Fetch 流式请求配置选项，扩展自 StreamRequestOptions
 */
export interface FetchStreamOptions extends StreamRequestOptions {
  /** 是否自动解析 SSE 格式数据（默认：true） */
  parseSSE?: boolean;
}

/**
 * fetchStream 返回结果，包含 reader 和取消方法
 */
export interface FetchStreamResult {
  /** 流读取器 */
  reader: ReadableStreamDefaultReader<Uint8Array>;
  /** 手动取消请求 */
  abort: () => void;
}

export async function fetchStream(
  url: string,
  options: FetchStreamOptions = {}
): Promise<FetchStreamResult> {
  const {
    parseSSE = true,
    timeout = 60000,
    model,
    onStart,
    onEnd,
    onMessage,
    onError,
    parseLine: customParseLine,
    signal: externalSignal,
    ...fetchOptions
  } = options;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const abortController = new AbortController();
  const activeSignal = abortController.signal;

  if (externalSignal) {
    if (externalSignal.aborted) {
      abortController.abort();
    } else {
      externalSignal.addEventListener('abort', () => {
        abortController.abort();
      }, { once: true });
    }
  }

  const startTimeout = () => {
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        abortController.abort();
        onError?.(new Error(`Stream request timeout after ${timeout}ms`));
      }, timeout);
    }
  };

  const clearAllTimeout = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const cleanup = () => {
    clearAllTimeout();
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...fetchOptions.headers,
      },
      body: fetchOptions.body,
      signal: activeSignal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP error ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    if (!response.body) {
      cleanup();
      throw new Error('Response body is null - streaming is not supported');
    }

    onStart?.();

    const reader = response.body.getReader();

    if (timeout > 0) {
      startTimeout();
    }

    const decoder = new TextDecoder();
    let buffer = '';

    const readStream = async (): Promise<void> => {
      while (true) {
        try {
          const { done, value } = await reader.read();

          if (done) {
            clearAllTimeout();
            if (buffer.trim()) {
              processBuffer(buffer, model, parseSSE, customParseLine, onMessage);
            }
            onEnd?.();
            cleanup();
            break;
          }

          clearAllTimeout();

          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              processLine(line, model, parseSSE, customParseLine, onMessage);
            }
          }

          if (timeout > 0) {
            startTimeout();
          }
        } catch (err) {
          cleanup();
          const error = err instanceof Error ? err : new Error(String(err));
          onError?.(error);
          break;
        }
      }
    };

    readStream().catch((err) => {
      cleanup();
      console.error('Unexpected stream error:', err);
    });

    const abort = () => {
      clearAllTimeout();
      abortController.abort();
      reader.cancel().catch(() => {});
    };

    return { reader, abort };
  } catch (err) {
    cleanup();
    const error = err instanceof Error ? err : new Error(String(err));
    onError?.(error);
    throw error;
  }
}

function processLine(
  line: string,
  model: AIModelProvider | undefined,
  parseSSE: boolean,
  customParseLine: ((line: string) => string | null) | undefined,
  onMessage?: ((data: string, isError?: boolean) => void)
): void {
  const trimmedLine = line.trim();
  if (!trimmedLine) return;
  console.log('原始行:', trimmedLine,model);

  if (customParseLine) {
    const result = customParseLine(trimmedLine);
    if (result !== null) {
      onMessage?.(result);
    }
    return;
  }

  if (parseSSE) {
    parseByModel(trimmedLine, model, onMessage);
  } else {
    onMessage?.(trimmedLine);
  }
}
/**
 * 解析不同 AI 厂商的流式数据行
 * @param trimmedLine 当天数据流的一行数据 (已去除两端空格)
 * @param model 模型类型
 * @param onMessage 解析出有效文本后的回调函数
 */
function parseByModel(
  trimmedLine: string, 
  model: AIModelProvider | undefined,
  onMessage?: ((data: string, isError?: boolean) => void)
) {
  // 1. 忽略空行
  if (!trimmedLine) return;

  // 2. Anthropic 等模型可能会发送 event 类型声明行，如 "event: content_block_delta"
  // 我们主要关心包含具体内容的 data 行，所以可以跳过 event 行
  if (trimmedLine.startsWith('event:')) {
    return;
  }

  // 3. 处理标准的 SSE data 行
  if (trimmedLine.startsWith('data:')) {
    // 截取 "data: " 后面的 JSON 字符串内容
    const dataStr = trimmedLine.slice(5).trim();

    // 遇到流结束标志，停止处理
    if (dataStr === '[DONE]') {
      return;
    }

    try {
      const json = JSON.parse(dataStr);
      let content = '';

      switch (model) {
        // OpenAI 兼容阵营
        case 'openai':
        case 'azure':
        case 'kimi':
        case 'qwen':
        case 'deepseek':
        case 'grok':
          // 典型结构: { choices: [{ delta: { content: "你好" } }] }
          content = json.choices?.[0]?.delta?.content || '';
          break;

        // Anthropic (Claude) 阵营
        case 'anthropic':
          // 典型结构: { type: "content_block_delta", delta: { type: "text_delta", text: "你好" } }
          if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
            content = json.delta.text || '';
          }
          break;

        // Google (Gemini) 阵营
        case 'google':
          // 典型结构: { candidates: [{ content: { parts: [{ text: "你好" }] } }] }
          content = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
          break;

        // 自定义接入
        case 'custom':
          // 根据你自己后端的封装格式来解析，这里举个例子
          content = json.msg || json.data?.content || '';
          break;

        default:
          console.warn(`[Stream Parser] 未知模型类型: ${model}`);
      }

      // 如果成功解析出文本内容，则触发回调
      if (content) {
        onMessage?.(content);
      }
      
    } catch (error) {
      // 容错处理：当大模型返回的 JSON 不完整或格式错误时
      console.error('[Stream Parser] JSON 解析失败:', error, '原始数据:', dataStr);
    }
  } else {
    // 处理非标准 SSE (如 Google 原生 REST 可能直接推 JSON 块)
    // 如果 trimmedLine 是合法的 JSON 且不是以 data: 开头
    try {
      if (trimmedLine.startsWith('{') || trimmedLine.startsWith('[')) {
         const json = JSON.parse(trimmedLine);
         // 处理非标准包裹的 Google 数据
         if (model === 'google' && json.candidates) {
             const content = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
             if (content) onMessage?.(content);
         }
      }
    } catch (e) {
      // 非合法 JSON，忽略
    }
  }
}

function processBuffer(
  buffer: string,
  model: AIModelProvider | undefined,
  parseSSE: boolean,
  customParseLine: ((line: string) => string | null) | undefined,
  onMessage?: ((data: string, isError?: boolean) => void)
): void {
  const lines = buffer.split('\n');
  for (const line of lines) {
    processLine(line, model, parseSSE, customParseLine, onMessage);
  }
}