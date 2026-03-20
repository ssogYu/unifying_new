/**
 * 流式请求配置选项
 */
export interface StreamRequestOptions extends RequestInit {
  /** HTTP 请求方法（默认：POST） */
  method?: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH';
  /** HTTP 请求头 */
  headers?: Record<string, string>;
  /** 请求体 */
  body?: BodyInit;
  /** 用于取消请求的 AbortSignal */
  signal?: AbortSignal;
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

export async function fetchStream(
  url: string,
  options: FetchStreamOptions = {}
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const {
    parseSSE = true,
    timeout = 60000,
    onStart,
    onEnd,
    onMessage,
    onError,
    parseLine: customParseLine,
    signal,
    ...fetchOptions
  } = options;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const userAbortController = signal ? null : new AbortController();
  const activeSignal = signal ?? userAbortController!.signal;

  const startTimeout = () => {
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        userAbortController?.abort();
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
              processBuffer(buffer, parseSSE, customParseLine, onMessage);
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
              processLine(line, parseSSE, customParseLine, onMessage);
            }
          }

          if (timeout > 0) {
            startTimeout();
          }
        } catch (err) {
          cleanup();
          const error = err instanceof Error ? err : new Error(String(err));
          onError?.(error);
          throw error;
        }
      }
    };

    readStream().catch((err) => {
      cleanup();
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
    });

    return reader;
  } catch (err) {
    cleanup();
    const error = err instanceof Error ? err : new Error(String(err));
    onError?.(error);
    throw error;
  }
}

function processLine(
  line: string,
  parseSSE: boolean,
  customParseLine: ((line: string) => string | null) | undefined,
  onMessage: ((data: string, isError?: boolean) => void) | undefined
): void {
  const trimmedLine = line.trim();
  if (!trimmedLine) return;

  if (customParseLine) {
    const result = customParseLine(trimmedLine);
    if (result !== null) {
      onMessage?.(result);
    }
    return;
  }

  if (parseSSE) {
    parseSSELine(trimmedLine, onMessage);
  } else {
    onMessage?.(trimmedLine);
  }
}

function parseSSELine(line: string, onMessage: ((data: string, isError?: boolean) => void) | undefined): void {
  if (line.startsWith('data:')) {
    const data = line.slice(5).trim();

    if (data === '[DONE]') {
      return;
    }

    if (data.startsWith('[ERROR]')) {
      onMessage?.(data.slice(7).trim(), true);
      return;
    }

    try {
      const parsed = JSON.parse(data);
      if (parsed.error) {
        onMessage?.(typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error), true);
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
  }
}

function processBuffer(
  buffer: string,
  parseSSE: boolean,
  customParseLine: ((line: string) => string | null) | undefined,
  onMessage: ((data: string, isError?: boolean) => void) | undefined
): void {
  const lines = buffer.split('\n');
  for (const line of lines) {
    processLine(line, parseSSE, customParseLine, onMessage);
  }
}