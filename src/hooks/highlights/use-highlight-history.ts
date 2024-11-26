// src/hooks/highlights/use-highlight-history.ts

import { useState, useCallback } from 'react';
import { HighlightHistory, HighlightHistoryAction, TextHighlight } from '@/types/highlight';

const MAX_HISTORY_LENGTH = 100; // Prevent memory issues with large histories

export function useHighlightHistory() {
    const [history, setHistory] = useState<HighlightHistory>({
        past: [],
        future: []
    });

    // Add action to history
    const pushToHistory = useCallback((action: HighlightHistoryAction) => {
        setHistory(current => ({
            past: [...current.past, action].slice(-MAX_HISTORY_LENGTH),
            future: [] // Clear redo stack when new action is performed
        }));
    }, []);

    // Record add action
    const recordAdd = useCallback((highlight: TextHighlight) => {
        pushToHistory({
            type: 'ADD',
            highlight
        });
    }, [pushToHistory]);

    // Record remove action
    const recordRemove = useCallback((highlight: TextHighlight) => {
        pushToHistory({
            type: 'REMOVE',
            highlight
        });
    }, [pushToHistory]);

    // Record update action
    const recordUpdate = useCallback((
        highlight: TextHighlight,
        previousHighlight: TextHighlight
    ) => {
        pushToHistory({
            type: 'UPDATE',
            highlight,
            previousHighlight
        });
    }, [pushToHistory]);

    // Undo last action
    const undo = useCallback(() => {
        setHistory(current => {
            const lastAction = current.past[current.past.length - 1];
            if (!lastAction) return current;

            return {
                past: current.past.slice(0, -1),
                future: [lastAction, ...current.future]
            };
        });

        return history.past[history.past.length - 1];
    }, [history]);

    // Redo last undone action
    const redo = useCallback(() => {
        setHistory(current => {
            const nextAction = current.future[0];
            if (!nextAction) return current;

            return {
                past: [...current.past, nextAction],
                future: current.future.slice(1)
            };
        });

        return history.future[0];
    }, [history]);

    const canUndo = history.past.length > 0;
    const canRedo = history.future.length > 0;

    return {
        recordAdd,
        recordRemove,
        recordUpdate,
        undo,
        redo,
        canUndo,
        canRedo
    };
}