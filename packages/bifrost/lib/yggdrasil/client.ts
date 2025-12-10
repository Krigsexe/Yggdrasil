/**
 * YGGDRASIL API Client
 *
 * Client for interacting with the YGGDRASIL backend API.
 * All requests go through HEIMDALL gateway.
 */

import type {
  YggdrasilQuery,
  YggdrasilResponse,
  YggdrasilResponseWithThinking,
  PipelineHealth,
  MemoryGraph,
  ThinkingStep,
} from './types';

const YGGDRASIL_API_BASE =
  process.env.NEXT_PUBLIC_YGGDRASIL_API_URL || 'http://localhost:3000';

/** Full API URL with prefix */
const YGGDRASIL_API_URL = `${YGGDRASIL_API_BASE}/api/v1`;

/** API error with structured details */
export class YggdrasilApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public requestId?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'YggdrasilApiError';
  }
}

/** Parse response and handle errors */
async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new YggdrasilApiError(
      data.message || 'Request failed',
      response.status,
      data.requestId,
      data
    );
  }

  return data as T;
}

/**
 * Query YGGDRASIL with a question
 *
 * @param query - The query request
 * @returns The validated response from YGGDRASIL
 *
 * @example
 * ```ts
 * const response = await queryYggdrasil({
 *   query: "What is the speed of light?",
 *   userId: "user-123",
 * });
 *
 * if (response.answer) {
 *   console.log(response.answer);
 *   console.log("Sources:", response.sources);
 * } else {
 *   console.log("YGGDRASIL says: I don't know");
 * }
 * ```
 */
export async function queryYggdrasil(
  query: YggdrasilQuery
): Promise<YggdrasilResponse> {
  const response = await fetch(`${YGGDRASIL_API_URL}/yggdrasil/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(query),
  });

  const data = await handleResponse<YggdrasilResponse>(response);

  // Convert timestamp string to Date
  return {
    ...data,
    timestamp: new Date(data.timestamp),
  };
}

/**
 * Query YGGDRASIL with thinking steps included
 *
 * Returns the response along with all reasoning steps.
 * Use this for displaying the reasoning process in the UI.
 *
 * @param query - The query request
 * @returns The response with thinking steps
 *
 * @example
 * ```ts
 * const response = await queryYggdrasilWithThinking({
 *   query: "What is quantum entanglement?",
 *   userId: "user-123",
 * });
 *
 * // Display thinking steps
 * response.thinking.forEach(step => {
 *   console.log(`[${step.phase}] ${step.thought}`);
 * });
 * ```
 */
export async function queryYggdrasilWithThinking(
  query: YggdrasilQuery
): Promise<YggdrasilResponseWithThinking> {
  const response = await fetch(`${YGGDRASIL_API_URL}/yggdrasil/query/thinking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(query),
  });

  const data = await handleResponse<YggdrasilResponseWithThinking>(response);

  // Convert timestamps
  return {
    ...data,
    timestamp: new Date(data.timestamp),
    thinking: data.thinking.map((step) => ({
      ...step,
      timestamp: new Date(step.timestamp),
    })),
  };
}

/**
 * Stream a query response from YGGDRASIL
 *
 * For long responses, this allows progressive display.
 *
 * @param query - The query request
 * @param onChunk - Callback for each chunk received
 * @returns The final complete response
 */
export async function streamYggdrasilQuery(
  query: YggdrasilQuery,
  onChunk: (chunk: string) => void
): Promise<YggdrasilResponse> {
  const response = await fetch(`${YGGDRASIL_API_URL}/yggdrasil/query/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new YggdrasilApiError(
      error.message || 'Stream request failed',
      response.status,
      error.requestId,
      error
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new YggdrasilApiError('No response body', 500);
  }

  const decoder = new TextDecoder();
  let fullContent = '';
  let finalResponse: YggdrasilResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'chunk') {
            fullContent += parsed.content;
            onChunk(parsed.content);
          } else if (parsed.type === 'final') {
            finalResponse = {
              ...parsed.response,
              timestamp: new Date(parsed.response.timestamp),
            };
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }
  }

  if (!finalResponse) {
    throw new YggdrasilApiError('No final response received', 500);
  }

  return finalResponse;
}

/**
 * Check the health of the YGGDRASIL pipeline
 *
 * @returns Health status of all components
 */
export async function checkPipelineHealth(): Promise<PipelineHealth> {
  const response = await fetch(`${YGGDRASIL_API_URL}/yggdrasil/health`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await handleResponse<PipelineHealth>(response);

  return {
    ...data,
    timestamp: new Date(data.timestamp),
  };
}

/**
 * Get the MUNIN memory graph for a user
 *
 * @param userId - The user ID
 * @param options - Optional parameters
 * @returns The memory graph with nodes and edges
 */
export async function getMemoryGraph(
  userId: string,
  options?: {
    limit?: number;
    since?: Date;
    types?: string[];
  }
): Promise<MemoryGraph> {
  const params = new URLSearchParams();
  params.set('userId', userId);

  if (options?.limit) {
    params.set('limit', options.limit.toString());
  }
  if (options?.since) {
    params.set('since', options.since.toISOString());
  }
  if (options?.types) {
    params.set('types', options.types.join(','));
  }

  const response = await fetch(
    `${YGGDRASIL_API_URL}/munin/graph?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  return handleResponse<MemoryGraph>(response);
}

/**
 * Create a checkpoint in MUNIN memory
 *
 * @param userId - The user ID
 * @param label - Label for the checkpoint
 * @param description - Optional description
 * @returns The checkpoint ID
 */
export async function createCheckpoint(
  userId: string,
  label: string,
  description?: string
): Promise<{ checkpointId: string }> {
  const response = await fetch(`${YGGDRASIL_API_URL}/munin/checkpoint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, label, description }),
  });

  return handleResponse<{ checkpointId: string }>(response);
}

/**
 * Rollback to a checkpoint in MUNIN memory
 *
 * @param userId - The user ID
 * @param checkpointId - The checkpoint ID to rollback to
 * @returns Success status
 */
export async function rollbackToCheckpoint(
  userId: string,
  checkpointId: string
): Promise<{ success: boolean; restoredMemories: number }> {
  const response = await fetch(`${YGGDRASIL_API_URL}/munin/rollback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, checkpointId }),
  });

  return handleResponse<{ success: boolean; restoredMemories: number }>(
    response
  );
}
