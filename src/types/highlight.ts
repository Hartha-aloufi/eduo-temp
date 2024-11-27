// src/types/highlight.ts

import { HighlightColorKey } from "@/constants/highlights";

export interface TextHighlight {
  id: string;
  startOffset: number;
  endOffset: number;
  elementId: string;
  color: HighlightColorKey;
  createdAt: string;
  text?: string;
}

export type HighlightHistoryAction = {
  type: "ADD" | "REMOVE" | "UPDATE";
  highlight: TextHighlight;
  previousHighlight?: TextHighlight;
  timestamp: number; // Added for better tracking
};

export type HighlightHistory = {
  past: HighlightHistoryAction[];
  future: HighlightHistoryAction[];
};
