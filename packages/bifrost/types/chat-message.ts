import { Tables } from "@/supabase/types"
import type { YggdrasilResponse } from "@/lib/yggdrasil/types"

export interface ChatMessage {
  message: Tables<"messages">
  fileItems: string[]
  /** YGGDRASIL response metadata if available */
  yggdrasilResponse?: YggdrasilResponse
}
