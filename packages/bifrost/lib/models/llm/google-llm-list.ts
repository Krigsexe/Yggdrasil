import { LLM } from "@/types"

const GOOGLE_PLATORM_LINK = "https://ai.google.dev/"

// Google Models (UPDATED 12/2024) -----------------------------

// Gemini 2.5 Flash (Latest - Recommended)
const GEMINI_2_5_FLASH: LLM = {
  modelId: "gemini-2.5-flash",
  modelName: "Gemini 2.5 Flash",
  provider: "google",
  hostedId: "gemini-2.5-flash",
  platformLink: GOOGLE_PLATORM_LINK,
  imageInput: true
}

// Gemini 2.5 Pro (Latest Pro)
const GEMINI_2_5_PRO: LLM = {
  modelId: "gemini-2.5-pro",
  modelName: "Gemini 2.5 Pro",
  provider: "google",
  hostedId: "gemini-2.5-pro",
  platformLink: GOOGLE_PLATORM_LINK,
  imageInput: true
}

// Gemini 2.0 Flash
const GEMINI_2_0_FLASH: LLM = {
  modelId: "gemini-2.0-flash",
  modelName: "Gemini 2.0 Flash",
  provider: "google",
  hostedId: "gemini-2.0-flash",
  platformLink: GOOGLE_PLATORM_LINK,
  imageInput: true
}

// Gemini 2.0 Flash Experimental
const GEMINI_2_0_FLASH_EXP: LLM = {
  modelId: "gemini-2.0-flash-exp",
  modelName: "Gemini 2.0 Flash (Experimental)",
  provider: "google",
  hostedId: "gemini-2.0-flash-exp",
  platformLink: GOOGLE_PLATORM_LINK,
  imageInput: true
}

export const GOOGLE_LLM_LIST: LLM[] = [
  GEMINI_2_5_FLASH,
  GEMINI_2_5_PRO,
  GEMINI_2_0_FLASH,
  GEMINI_2_0_FLASH_EXP
]
