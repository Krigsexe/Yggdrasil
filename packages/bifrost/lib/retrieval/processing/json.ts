import { FileItemChunk } from "@/types"
import { encode } from "gpt-tokenizer"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { CHUNK_OVERLAP, CHUNK_SIZE } from "."

/**
 * Recursively extract text values from a JSON object
 */
function extractTextFromJSON(obj: unknown, texts: string[] = []): string[] {
  if (obj === null || obj === undefined) {
    return texts
  }

  if (typeof obj === 'string') {
    if (obj.trim()) {
      texts.push(obj.trim())
    }
  } else if (typeof obj === 'number' || typeof obj === 'boolean') {
    texts.push(String(obj))
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      extractTextFromJSON(item, texts)
    }
  } else if (typeof obj === 'object') {
    for (const value of Object.values(obj)) {
      extractTextFromJSON(value, texts)
    }
  }

  return texts
}

export const processJSON = async (json: Blob): Promise<FileItemChunk[]> => {
  const fileBuffer = Buffer.from(await json.arrayBuffer())
  const textDecoder = new TextDecoder("utf-8")
  const jsonText = textDecoder.decode(fileBuffer)

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(jsonText)
  } catch {
    // If parsing fails, treat as plain text
    parsedJson = jsonText
  }

  const textParts = extractTextFromJSON(parsedJson)
  const completeText = textParts.join(" ")

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP
  })
  const splitDocs = await splitter.createDocuments([completeText])

  let chunks: FileItemChunk[] = []

  for (let i = 0; i < splitDocs.length; i++) {
    const doc = splitDocs[i]

    chunks.push({
      content: doc.pageContent,
      tokens: encode(doc.pageContent).length
    })
  }

  return chunks
}
