/**
 * BIFROST Supabase Types (Compatibility Layer)
 *
 * This file provides Supabase-compatible types for the BIFROST frontend.
 * Since YGGDRASIL uses Prisma instead of Supabase for persistence,
 * this is a minimal stub to maintain compatibility with original Bifrost code.
 *
 * Tables and types here map to our Prisma schema in prisma/schema.prisma
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string
          username: string
          bio: string
          image_url: string | null
          image_path: string
          profile_context: string
          use_azure_openai: boolean
          openai_api_key: string | null
          openai_organization_id: string | null
          anthropic_api_key: string | null
          google_gemini_api_key: string | null
          mistral_api_key: string | null
          groq_api_key: string | null
          perplexity_api_key: string | null
          azure_openai_api_key: string | null
          azure_openai_endpoint: string | null
          azure_openai_35_turbo_id: string | null
          azure_openai_45_turbo_id: string | null
          azure_openai_45_vision_id: string | null
          azure_openai_embeddings_id: string | null
          openrouter_api_key: string | null
          has_onboarded: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string
          username?: string
          bio?: string
          image_url?: string | null
          image_path?: string
          profile_context?: string
          use_azure_openai?: boolean
          openai_api_key?: string | null
          openai_organization_id?: string | null
          anthropic_api_key?: string | null
          google_gemini_api_key?: string | null
          mistral_api_key?: string | null
          groq_api_key?: string | null
          perplexity_api_key?: string | null
          azure_openai_api_key?: string | null
          azure_openai_endpoint?: string | null
          azure_openai_35_turbo_id?: string | null
          azure_openai_45_turbo_id?: string | null
          azure_openai_45_vision_id?: string | null
          azure_openai_embeddings_id?: string | null
          openrouter_api_key?: string | null
          has_onboarded?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string
          username?: string
          bio?: string
          image_url?: string | null
          image_path?: string
          profile_context?: string
          use_azure_openai?: boolean
          openai_api_key?: string | null
          openai_organization_id?: string | null
          anthropic_api_key?: string | null
          google_gemini_api_key?: string | null
          mistral_api_key?: string | null
          groq_api_key?: string | null
          perplexity_api_key?: string | null
          azure_openai_api_key?: string | null
          azure_openai_endpoint?: string | null
          azure_openai_35_turbo_id?: string | null
          azure_openai_45_turbo_id?: string | null
          azure_openai_45_vision_id?: string | null
          azure_openai_embeddings_id?: string | null
          openrouter_api_key?: string | null
          has_onboarded?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }
      workspaces: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          sharing: string
          default_context_length: number
          default_model: string
          default_prompt: string
          default_temperature: number
          embeddings_provider: string
          include_profile_context: boolean
          include_workspace_instructions: boolean
          instructions: string
          is_home: boolean
          image_path: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name?: string
          description?: string
          sharing?: string
          default_context_length?: number
          default_model?: string
          default_prompt?: string
          default_temperature?: number
          embeddings_provider?: string
          include_profile_context?: boolean
          include_workspace_instructions?: boolean
          instructions?: string
          is_home?: boolean
          image_path?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string
          sharing?: string
          default_context_length?: number
          default_model?: string
          default_prompt?: string
          default_temperature?: number
          embeddings_provider?: string
          include_profile_context?: boolean
          include_workspace_instructions?: boolean
          instructions?: string
          is_home?: boolean
          image_path?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      folders: {
        Row: {
          id: string
          user_id: string
          workspace_id: string
          name: string
          description: string
          type: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id: string
          name: string
          description?: string
          type: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          workspace_id?: string
          name?: string
          description?: string
          type?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      chats: {
        Row: {
          id: string
          user_id: string
          workspace_id: string
          folder_id: string | null
          assistant_id: string | null
          name: string
          context_length: number
          model: string
          prompt: string
          temperature: number
          include_profile_context: boolean
          include_workspace_instructions: boolean
          embeddings_provider: string
          sharing: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id: string
          folder_id?: string | null
          assistant_id?: string | null
          name: string
          context_length?: number
          model: string
          prompt: string
          temperature?: number
          include_profile_context?: boolean
          include_workspace_instructions?: boolean
          embeddings_provider?: string
          sharing?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          workspace_id?: string
          folder_id?: string | null
          assistant_id?: string | null
          name?: string
          context_length?: number
          model?: string
          prompt?: string
          temperature?: number
          include_profile_context?: boolean
          include_workspace_instructions?: boolean
          embeddings_provider?: string
          sharing?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          user_id: string
          chat_id: string
          assistant_id: string | null
          role: string
          content: string
          model: string
          sequence_number: number
          image_paths: string[]
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          chat_id: string
          assistant_id?: string | null
          role: string
          content: string
          model: string
          sequence_number: number
          image_paths?: string[]
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          chat_id?: string
          assistant_id?: string | null
          role?: string
          content?: string
          model?: string
          sequence_number?: number
          image_paths?: string[]
          created_at?: string
          updated_at?: string | null
        }
      }
      assistants: {
        Row: {
          id: string
          user_id: string
          workspace_id: string
          folder_id: string | null
          name: string
          description: string
          model: string
          prompt: string
          temperature: number
          context_length: number
          include_profile_context: boolean
          include_workspace_instructions: boolean
          image_path: string
          embeddings_provider: string
          sharing: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id: string
          folder_id?: string | null
          name: string
          description?: string
          model: string
          prompt: string
          temperature?: number
          context_length?: number
          include_profile_context?: boolean
          include_workspace_instructions?: boolean
          image_path?: string
          embeddings_provider?: string
          sharing?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          workspace_id?: string
          folder_id?: string | null
          name?: string
          description?: string
          model?: string
          prompt?: string
          temperature?: number
          context_length?: number
          include_profile_context?: boolean
          include_workspace_instructions?: boolean
          image_path?: string
          embeddings_provider?: string
          sharing?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      files: {
        Row: {
          id: string
          user_id: string
          workspace_id: string
          folder_id: string | null
          name: string
          description: string
          file_path: string
          size: number
          type: string
          tokens: number
          sharing: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id: string
          folder_id?: string | null
          name: string
          description?: string
          file_path: string
          size: number
          type: string
          tokens?: number
          sharing?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          workspace_id?: string
          folder_id?: string | null
          name?: string
          description?: string
          file_path?: string
          size?: number
          type?: string
          tokens?: number
          sharing?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      presets: {
        Row: {
          id: string
          user_id: string
          workspace_id: string
          folder_id: string | null
          name: string
          description: string
          model: string
          prompt: string
          temperature: number
          context_length: number
          include_profile_context: boolean
          include_workspace_instructions: boolean
          embeddings_provider: string
          sharing: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id: string
          folder_id?: string | null
          name: string
          description?: string
          model: string
          prompt: string
          temperature?: number
          context_length?: number
          include_profile_context?: boolean
          include_workspace_instructions?: boolean
          embeddings_provider?: string
          sharing?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          workspace_id?: string
          folder_id?: string | null
          name?: string
          description?: string
          model?: string
          prompt?: string
          temperature?: number
          context_length?: number
          include_profile_context?: boolean
          include_workspace_instructions?: boolean
          embeddings_provider?: string
          sharing?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      prompts: {
        Row: {
          id: string
          user_id: string
          workspace_id: string
          folder_id: string | null
          name: string
          content: string
          sharing: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id: string
          folder_id?: string | null
          name: string
          content: string
          sharing?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          workspace_id?: string
          folder_id?: string | null
          name?: string
          content?: string
          sharing?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      tools: {
        Row: {
          id: string
          user_id: string
          workspace_id: string
          folder_id: string | null
          name: string
          description: string
          url: string
          custom_headers: Json
          schema_value: Json
          sharing: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id: string
          folder_id?: string | null
          name: string
          description?: string
          url: string
          custom_headers?: Json
          schema_value: Json
          sharing?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          workspace_id?: string
          folder_id?: string | null
          name?: string
          description?: string
          url?: string
          custom_headers?: Json
          schema_value?: Json
          sharing?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      models: {
        Row: {
          id: string
          user_id: string
          workspace_id: string
          folder_id: string | null
          name: string
          description: string
          api_key: string
          base_url: string
          model_id: string
          context_length: number
          sharing: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id: string
          folder_id?: string | null
          name: string
          description?: string
          api_key: string
          base_url: string
          model_id: string
          context_length?: number
          sharing?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          workspace_id?: string
          folder_id?: string | null
          name?: string
          description?: string
          api_key?: string
          base_url?: string
          model_id?: string
          context_length?: number
          sharing?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      collections: {
        Row: {
          id: string
          user_id: string
          workspace_id: string
          folder_id: string | null
          name: string
          description: string
          sharing: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id: string
          folder_id?: string | null
          name: string
          description?: string
          sharing?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          workspace_id?: string
          folder_id?: string | null
          name?: string
          description?: string
          sharing?: string
          created_at?: string
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never
