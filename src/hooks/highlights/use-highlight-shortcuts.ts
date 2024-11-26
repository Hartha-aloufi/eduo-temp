// src/hooks/highlights/use-highlight-shortcuts.ts

import { useEffect } from 'react';

interface UseHighlightShortcutsProps {
    onUndo: () => void;
    onRedo: () => void;
    enabled: boolean;
}

export function useHighlightShortcuts({
    onUndo,
    onRedo,
    enabled
}: UseHighlightShortcutsProps) {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
                return;
            }

            // Handle undo (Cmd/Ctrl + Z)
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                onUndo();
            }

            // Handle redo (Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y)
            if ((e.metaKey || e.ctrlKey) && (
                (e.key === 'z' && e.shiftKey) ||
                e.key === 'y'
            )) {
                e.preventDefault();
                onRedo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled, onUndo, onRedo]);
}