/**
 * API 相关 React Hooks
 * 提供优雅的状态管理和错误处理
 */

import { useState, useEffect, useCallback } from 'react'
import { UserApiService } from '../services/api'

/**
 * API 请求状态
 */
export interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * 通用 API Hook
 */
export function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
): ApiState<T> & { refetch: () => void } {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await apiCall()
      setState({
        data: result,
        loading: false,
        error: null,
      })
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : '请求失败',
      })
    }
  }, dependencies)

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { ...state, refetch: fetchData }
}

/**
 * 手动 API 调用 Hook
 */
export function useApiCall<T, P extends any[]>(
  apiCall: (...args: P) => Promise<T>
): {
  data: T | null
  loading: boolean
  error: string | null
  execute: (...args: P) => Promise<void>
  reset: () => void
} {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(async (...args: P) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await apiCall(...args)
      setState({
        data: result,
        loading: false,
        error: null,
      })
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : '请求失败',
      })
    }
  }, [apiCall])

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    })
  }, [])

  return { ...state, execute, reset }
}