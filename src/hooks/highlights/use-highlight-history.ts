// src/hooks/highlights/use-highlight-history.ts

import { useState, useCallback, useRef } from "react";
import {
  HighlightHistory,
  HighlightHistoryAction,
  TextHighlight,
} from "@/types/highlight";
import { HighlightColorKey } from "@/constants/highlights";

const MAX_HISTORY_LENGTH = 100;

interface HighlightIdMap {
  [originalId: string]: string; // Maps original highlight IDs to their current versions
}

export function useHighlightHistory() {
  const [history, setHistory] = useState<HighlightHistory>({
    past: [],
    future: [],
  });

  const [isUndoingOrRedoing, setIsUndoingOrRedoing] = useState(false);

  // Keep track of highlight IDs across undo/redo cycles
  const idMapRef = useRef<HighlightIdMap>({});

  // Map or create new ID for highlight
  const mapHighlightId = useCallback(
    (highlight: TextHighlight, newId?: string) => {
      if (newId) {
        idMapRef.current[highlight.id] = newId;
      }
      return idMapRef.current[highlight.id] || highlight.id;
    },
    []
  );

  const pushToHistory = useCallback(
    (action: HighlightHistoryAction) => {
      if (isUndoingOrRedoing) return;

      setHistory((current) => ({
        past: [...current.past, action].slice(-MAX_HISTORY_LENGTH),
        future: [],
      }));
    },
    [isUndoingOrRedoing]
  );

  // Record add action
  const recordAdd = useCallback(
    (highlight: TextHighlight, newId?: string) => {
      if (newId) {
        idMapRef.current[highlight.id] = newId;
      }

      pushToHistory({
        type: "ADD",
        highlight,
        timestamp: Date.now(),
      });
    },
    [pushToHistory]
  );

  // Record remove action
  const recordRemove = useCallback(
    (highlight: TextHighlight) => {
      pushToHistory({
        type: "REMOVE",
        highlight: {
          ...highlight,
          id: mapHighlightId(highlight),
        },
        timestamp: Date.now(),
      });
    },
    [pushToHistory, mapHighlightId]
  );

  // Record update action
  const recordUpdate = useCallback(
    (highlight: TextHighlight, previousHighlight: TextHighlight) => {
      pushToHistory({
        type: "UPDATE",
        highlight: {
          ...highlight,
          id: mapHighlightId(highlight),
        },
        previousHighlight: {
          ...previousHighlight,
          id: mapHighlightId(previousHighlight),
        },
        timestamp: Date.now(),
      });
    },
    [pushToHistory, mapHighlightId]
  );

  // Undo last action
  const undo = useCallback(async () => {
    setIsUndoingOrRedoing(true);

    try {
      const lastAction = history.past[history.past.length - 1];
      if (!lastAction) return null;

      setHistory((current) => ({
        past: current.past.slice(0, -1),
        future: [lastAction, ...current.future],
      }));

      // Map the highlight ID to its current version
      const mappedAction = {
        ...lastAction,
        highlight: {
          ...lastAction.highlight,
          id: mapHighlightId(lastAction.highlight),
        },
        previousHighlight: lastAction.previousHighlight
          ? {
              ...lastAction.previousHighlight,
              id: mapHighlightId(lastAction.previousHighlight),
            }
          : undefined,
      };

      return mappedAction;
    } finally {
      // Ensure we reset the flag after state updates
      setTimeout(() => setIsUndoingOrRedoing(false), 0);
    }
  }, [history, mapHighlightId]);

  // Redo last undone action
  const redo = useCallback(async () => {
    setIsUndoingOrRedoing(true);

    try {
      const nextAction = history.future[0];
      if (!nextAction) return null;

      setHistory((current) => ({
        past: [...current.past, nextAction],
        future: current.future.slice(1),
      }));

      // Map the highlight ID to its current version
      const mappedAction = {
        ...nextAction,
        highlight: {
          ...nextAction.highlight,
          id: mapHighlightId(nextAction.highlight),
        },
        previousHighlight: nextAction.previousHighlight
          ? {
              ...nextAction.previousHighlight,
              id: mapHighlightId(nextAction.previousHighlight),
            }
          : undefined,
      };

      return mappedAction;
    } finally {
      setTimeout(() => setIsUndoingOrRedoing(false), 0);
    }
  }, [history, mapHighlightId]);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory({ past: [], future: [] });
    idMapRef.current = {};
  }, []);

  return {
    recordAdd,
    recordRemove,
    recordUpdate,
    undo,
    redo,
    clearHistory,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    mapHighlightId,
  };
}
