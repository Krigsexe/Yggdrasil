/**
 * YGGDRASIL Chat API Route
 *
 * Routes chat messages through the YGGDRASIL pipeline via HEIMDALL.
 * Uses SSE streaming to show reasoning steps in REAL-TIME as they happen.
 *
 * The "Semantic Scribe" - bridges HEIMDALL SSE to browser with true real-time streaming.
 */

import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"

// Use Edge runtime for streaming support
export const runtime = "edge"

const YGGDRASIL_API_URL =
  process.env.NEXT_PUBLIC_YGGDRASIL_API_URL || "http://localhost:3000"

/**
 * Phase labels (no emojis)
 */
const phaseLabels: Record<string, string> = {
  routing: 'Analyse',
  gathering: 'Recherche',
  deliberating: 'Deliberation',
  validating: 'Validation',
  responding: 'Reponse',
}

/**
 * Extract text content from a message (handles both OpenAI and Gemini formats)
 */
function extractMessageContent(message: { role: string; content?: string; parts?: Array<{ text?: string }> }): string {
  if (message.content) {
    return message.content
  }
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join("\n")
  }
  return ""
}

/**
 * Parse SSE data and emit markdown progressively
 * This is the "Semantic Scribe" - it writes as events arrive
 */
function processSSELine(
  line: string,
  state: { thinkingStarted: boolean; answerStarted: boolean; requestId: string },
  emit: (text: string) => void
): void {
  if (!line.startsWith('data: ')) return

  const dataStr = line.slice(6).trim()
  if (!dataStr || dataStr === '[DONE]') return

  try {
    const data = JSON.parse(dataStr)

    if (data.type === 'thinking') {
      // Stream thinking step immediately with simple markdown (no HTML)
      if (!state.thinkingStarted) {
        emit(`**Raisonnement YGGDRASIL**\n\n`)
        state.thinkingStarted = true
      }

      const step = data.step
      const label = phaseLabels[step.phase] || step.phase
      emit(`> **${label}**: ${step.thought}\n\n`)
    } else if (data.type === 'answer_chunk') {
      // Stream each word as it arrives from backend
      // Add separator before first chunk if coming from thinking
      if (state.thinkingStarted && !state.answerStarted) {
        emit(`\n---\n\n`)
        state.answerStarted = true
      }
      emit(data.chunk)
    } else if (data.type === 'response') {
      // Final response metadata - answer already streamed via chunks
      const resp = data.response
      state.requestId = resp.requestId || ""

      // If no chunks were streamed (answer was null), show fallback
      if (!state.answerStarted && !resp.answer) {
        if (state.thinkingStarted) {
          emit(`\n---\n\n`)
        }
        emit(`Je n'ai pas d'information verifiee pour repondre a cette question avec certitude.`)
      }
    } else if (data.type === 'error') {
      emit(`Erreur: ${data.message}`)
    }
  } catch {
    // Skip invalid JSON
  }
}

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: Array<{ role: string; content?: string; parts?: Array<{ text?: string }> }>
  }

  try {
    const profile = await getServerProfile()

    // Get the last user message as the query
    const userMessages = messages.filter((m) => m.role === "user")
    const lastUserMessage = userMessages[userMessages.length - 1]

    if (!lastUserMessage) {
      return new Response(
        JSON.stringify({ message: "No user message found" }),
        { status: 400 }
      )
    }

    const queryContent = extractMessageContent(lastUserMessage)
    if (!queryContent) {
      return new Response(
        JSON.stringify({ message: "Empty message content" }),
        { status: 400 }
      )
    }

    // Build conversation context from previous messages
    const context = messages.slice(0, -1).map((m) => ({
      role: m.role,
      content: extractMessageContent(m),
    }))

    // Stream from YGGDRASIL via HEIMDALL SSE endpoint
    const response = await fetch(`${YGGDRASIL_API_URL}/api/v1/yggdrasil/query/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
      },
      body: JSON.stringify({
        query: queryContent,
        userId: profile.user_id,
        sessionId: chatSettings.contextLength?.toString(),
        context: {
          conversationHistory: context,
          model: chatSettings.model,
        },
        options: {
          returnTrace: false,
          returnReasoning: true,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }))
      throw new Error(error.message || `YGGDRASIL error: ${response.status}`)
    }

    // Create a ReadableStream that processes SSE events in real-time
    // This is the "Semantic Scribe" that writes as it receives
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const state = { thinkingStarted: false, answerStarted: false, requestId: "" }
    let buffer = ""

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        const emit = (text: string) => {
          controller.enqueue(encoder.encode(text))
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            // Decode chunk and add to buffer
            buffer += decoder.decode(value, { stream: true })

            // Process complete lines immediately
            const lines = buffer.split('\n')
            // Keep the last incomplete line in buffer
            buffer = lines.pop() || ""

            // Process each complete line RIGHT NOW
            for (const line of lines) {
              if (line.trim()) {
                processSSELine(line, state, emit)
              }
            }
          }

          // Process any remaining buffer
          if (buffer.trim()) {
            processSSELine(buffer, state, emit)
          }
        } catch (error) {
          console.error('Stream error:', error)
        } finally {
          controller.close()
        }
      },
    })

    // Return with streaming headers to prevent buffering
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Accel-Buffering": "no",
        "Transfer-Encoding": "chunked",
        "X-Yggdrasil-Request-Id": state.requestId,
      },
    })
  } catch (error: unknown) {
    const err = error as Error
    let errorMessage = err.message || "An unexpected error occurred"

    if (errorMessage.includes("ECONNREFUSED")) {
      errorMessage =
        "YGGDRASIL backend is not running. Please start HEIMDALL on port 3000."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: 500,
    })
  }
}
