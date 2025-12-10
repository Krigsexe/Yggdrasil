/**
 * YGGDRASIL React Hooks
 *
 * Custom hooks for using the YGGDRASIL API in React components.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  queryYggdrasil,
  streamYggdrasilQuery,
  checkPipelineHealth,
  getMemoryGraph,
  createCheckpoint,
  rollbackToCheckpoint,
  YggdrasilApiError,
} from './client';
import type {
  YggdrasilQuery,
  YggdrasilResponse,
  PipelineHealth,
  MemoryGraph,
} from './types';

/** State for async operations */
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: YggdrasilApiError | null;
}

/**
 * Hook for querying YGGDRASIL
 *
 * @returns Query function and state
 *
 * @example
 * ```tsx
 * function ChatInput() {
 *   const { query, loading, error, response } = useYggdrasilQuery();
 *
 *   const handleSubmit = async (text: string) => {
 *     await query({
 *       query: text,
 *       userId: "user-123",
 *     });
 *   };
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   if (response) return <Response data={response} />;
 * }
 * ```
 */
export function useYggdrasilQuery() {
  const [state, setState] = useState<AsyncState<YggdrasilResponse>>({
    data: null,
    loading: false,
    error: null,
  });

  const query = useCallback(async (request: YggdrasilQuery) => {
    setState({ data: null, loading: true, error: null });

    try {
      const response = await queryYggdrasil(request);
      setState({ data: response, loading: false, error: null });
      return response;
    } catch (err) {
      const error =
        err instanceof YggdrasilApiError
          ? err
          : new YggdrasilApiError('Unknown error', 500, undefined, err);
      setState({ data: null, loading: false, error });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    query,
    reset,
    response: state.data,
    loading: state.loading,
    error: state.error,
  };
}

/**
 * Hook for streaming YGGDRASIL queries
 *
 * @returns Stream function and state with partial content
 *
 * @example
 * ```tsx
 * function StreamingResponse() {
 *   const { stream, loading, partialContent, response } = useYggdrasilStream();
 *
 *   // partialContent updates in real-time as chunks arrive
 *   return <div>{partialContent}</div>;
 * }
 * ```
 */
export function useYggdrasilStream() {
  const [state, setState] = useState<
    AsyncState<YggdrasilResponse> & { partialContent: string }
  >({
    data: null,
    loading: false,
    error: null,
    partialContent: '',
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const stream = useCallback(async (request: YggdrasilQuery) => {
    // Abort any existing stream
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setState({ data: null, loading: true, error: null, partialContent: '' });

    try {
      const response = await streamYggdrasilQuery(request, (chunk) => {
        setState((prev) => ({
          ...prev,
          partialContent: prev.partialContent + chunk,
        }));
      });

      setState({
        data: response,
        loading: false,
        error: null,
        partialContent: response.answer || '',
      });

      return response;
    } catch (err) {
      const error =
        err instanceof YggdrasilApiError
          ? err
          : new YggdrasilApiError('Stream error', 500, undefined, err);
      setState((prev) => ({ ...prev, loading: false, error }));
      throw error;
    }
  }, []);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setState((prev) => ({ ...prev, loading: false }));
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState({ data: null, loading: false, error: null, partialContent: '' });
  }, []);

  return {
    stream,
    cancel,
    reset,
    response: state.data,
    partialContent: state.partialContent,
    loading: state.loading,
    error: state.error,
  };
}

/**
 * Hook for checking pipeline health
 *
 * @param pollInterval - Optional interval in ms to poll health status
 * @returns Health status and refresh function
 */
export function usePipelineHealth(pollInterval?: number) {
  const [state, setState] = useState<AsyncState<PipelineHealth>>({
    data: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const health = await checkPipelineHealth();
      setState({ data: health, loading: false, error: null });
      return health;
    } catch (err) {
      const error =
        err instanceof YggdrasilApiError
          ? err
          : new YggdrasilApiError('Health check failed', 500, undefined, err);
      setState({ data: null, loading: false, error });
      throw error;
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {});

    if (pollInterval && pollInterval > 0) {
      const interval = setInterval(() => {
        refresh().catch(() => {});
      }, pollInterval);

      return () => clearInterval(interval);
    }
  }, [refresh, pollInterval]);

  return {
    health: state.data,
    loading: state.loading,
    error: state.error,
    refresh,
  };
}

/**
 * Hook for MUNIN memory graph
 *
 * @param userId - The user ID
 * @param options - Optional query parameters
 * @returns Memory graph and operations
 */
export function useMuninMemory(
  userId: string,
  options?: {
    limit?: number;
    autoRefresh?: boolean;
  }
) {
  const [state, setState] = useState<AsyncState<MemoryGraph>>({
    data: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const graph = await getMemoryGraph(userId, { limit: options?.limit });
      setState({ data: graph, loading: false, error: null });
      return graph;
    } catch (err) {
      const error =
        err instanceof YggdrasilApiError
          ? err
          : new YggdrasilApiError(
              'Failed to load memory graph',
              500,
              undefined,
              err
            );
      setState({ data: null, loading: false, error });
      throw error;
    }
  }, [userId, options?.limit]);

  const checkpoint = useCallback(
    async (label: string, description?: string) => {
      const result = await createCheckpoint(userId, label, description);
      if (options?.autoRefresh) {
        await refresh();
      }
      return result;
    },
    [userId, options?.autoRefresh, refresh]
  );

  const rollback = useCallback(
    async (checkpointId: string) => {
      const result = await rollbackToCheckpoint(userId, checkpointId);
      if (options?.autoRefresh) {
        await refresh();
      }
      return result;
    },
    [userId, options?.autoRefresh, refresh]
  );

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  return {
    graph: state.data,
    loading: state.loading,
    error: state.error,
    refresh,
    checkpoint,
    rollback,
  };
}

/**
 * Hook for tracking response history in a chat session
 *
 * @returns History management functions
 */
export function useYggdrasilHistory() {
  const [history, setHistory] = useState<YggdrasilResponse[]>([]);

  const addResponse = useCallback((response: YggdrasilResponse) => {
    setHistory((prev) => [...prev, response]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const removeResponse = useCallback((requestId: string) => {
    setHistory((prev) => prev.filter((r) => r.requestId !== requestId));
  }, []);

  return {
    history,
    addResponse,
    clearHistory,
    removeResponse,
    totalResponses: history.length,
    verifiedCount: history.filter((r) => r.isVerified).length,
    averageConfidence:
      history.length > 0
        ? history.reduce((sum, r) => sum + r.confidence, 0) / history.length
        : 0,
  };
}
