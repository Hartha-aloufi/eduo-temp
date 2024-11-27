import { useCallback } from "react";
import { TextHighlight } from "@/types/highlight";
import { useSession } from "@/hooks/use-auth-query";
import { useLessonHighlights } from "./use-highlight-sync";
import { useHighlightQueue } from "./use-highlight-queue";
import { useHighlightHistory } from "./use-highlight-history";
import { HighlightColorKey } from "@/constants/highlights";
import { toast } from "sonner";

/**
 * Hook to manage highlight storage with optimized network requests
 */
export const useHighlightStorage = (
    topicId: string,
    lessonId: string,
    activeColor: HighlightColorKey
) => {
    const { data: session } = useSession();
    const isAuthenticated = !!session?.data.session;
    const history = useHighlightHistory();

    // Fetch existing highlights
    const { data: highlights = [], isLoading } = useLessonHighlights(topicId, lessonId);

    // Initialize operation queue
    const { queueOperation, forceFlush } = useHighlightQueue(topicId, lessonId);

    /**
     * Add a new highlight
     */
    const addHighlight = useCallback(
        async (info: {
            text: string;
            startOffset: number;
            endOffset: number;
            elementId: string;
            skipHistory?: boolean;
        }) => {
            if (!isAuthenticated) {
                toast.error("يجب تسجيل الدخول لإضافة تظليل");
                return;
            }

            // Generate temporary ID for optimistic updates
            const tempId = `temp-${Date.now()}`;

            // Queue the create operation
            queueOperation({
                id: tempId,
                type: 'create',
                data: {
                    topic_id: topicId,
                    lesson_id: lessonId,
                    element_id: info.elementId,
                    start_offset: info.startOffset,
                    end_offset: info.endOffset,
                    color: activeColor,
                },
            });

            // Record in history if needed
            if (!info.skipHistory) {
                history.recordAdd({
                    id: tempId,
                    startOffset: info.startOffset,
                    endOffset: info.endOffset,
                    elementId: info.elementId,
                    color: activeColor,
                    text: info.text,
                    createdAt: new Date().toISOString(),
                });
            }
        },
        [isAuthenticated, queueOperation, topicId, lessonId, activeColor, history]
    );

    /**
     * Remove a highlight
     */
    const removeHighlight = useCallback(
        async (id: string, skipHistory = false) => {
            if (!isAuthenticated) {
                toast.error("يجب تسجيل الدخول لحذف التظليل");
                return;
            }

            const highlight = highlights.find((h) => h.id === id);
            if (!highlight) return;

            // Queue the delete operation
            queueOperation({
                id,
                type: 'delete',
                data: { is_deleted: true },
            });

            // Record in history if needed
            if (!skipHistory) {
                history.recordRemove({
                    id: highlight.id,
                    startOffset: highlight.start_offset,
                    endOffset: highlight.end_offset,
                    elementId: highlight.element_id,
                    color: highlight.color as HighlightColorKey,
                    createdAt: highlight.created_at,
                });
            }
        },
        [isAuthenticated, queueOperation, highlights, history]
    );

    /**
     * Update highlight options
     */
    const updateHighlight = useCallback(
        async (
            id: string,
            options: { color: HighlightColorKey },
            skipHistory = false
        ) => {
            if (!isAuthenticated) {
                toast.error("يجب تسجيل الدخول لتعديل التظليل");
                return;
            }

            const highlight = highlights.find((h) => h.id === id);
            if (!highlight) return;

            // Queue the update operation
            queueOperation({
                id,
                type: 'update',
                data: { color: options.color },
            });

            // Record in history if needed
            if (!skipHistory) {
                history.recordUpdate(
                    {
                        id: highlight.id,
                        startOffset: highlight.start_offset,
                        endOffset: highlight.end_offset,
                        elementId: highlight.element_id,
                        color: options.color,
                        createdAt: highlight.created_at,
                    },
                    {
                        id: highlight.id,
                        startOffset: highlight.start_offset,
                        endOffset: highlight.end_offset,
                        elementId: highlight.element_id,
                        color: highlight.color as HighlightColorKey,
                        createdAt: highlight.created_at,
                    }
                );
            }
        },
        [isAuthenticated, queueOperation, highlights, history]
    );

    /**
     * Handle undo operation
     */
    const handleUndo = useCallback(async () => {
        const action = await history.undo();
        if (!action) return;

        switch (action.type) {
            case "ADD":
                await removeHighlight(action.highlight.id, true);
                break;
            case "REMOVE":
                await addHighlight({
                    text: action.highlight.text || "",
                    startOffset: action.highlight.startOffset,
                    endOffset: action.highlight.endOffset,
                    elementId: action.highlight.elementId,
                    skipHistory: true,
                });
                break;
            case "UPDATE":
                if (action.previousHighlight) {
                    await updateHighlight(
                        action.highlight.id,
                        { color: action.previousHighlight.color },
                        true
                    );
                }
                break;
        }
    }, [history, removeHighlight, addHighlight, updateHighlight]);

    /**
     * Handle redo operation
     */
    const handleRedo = useCallback(async () => {
        const action = await history.redo();
        if (!action) return;

        switch (action.type) {
            case "ADD":
                await addHighlight({
                    text: action.highlight.text || "",
                    startOffset: action.highlight.startOffset,
                    endOffset: action.highlight.endOffset,
                    elementId: action.highlight.elementId,
                    skipHistory: true,
                });
                break;
            case "REMOVE":
                await removeHighlight(action.highlight.id, true);
                break;
            case "UPDATE":
                await updateHighlight(
                    action.highlight.id,
                    { color: action.highlight.color },
                    true
                );
                break;
        }
    }, [history, removeHighlight, addHighlight, updateHighlight]);

    // Transform highlights to UI format
    const formattedHighlights: TextHighlight[] = highlights.map((h) => ({
        id: h.id,
        text: "",
        startOffset: h.start_offset,
        endOffset: h.end_offset,
        elementId: h.element_id,
        color: h.color as HighlightColorKey,
        createdAt: h.created_at,
    }));

    return {
        highlights: formattedHighlights,
        isLoading,
        addHighlight,
        removeHighlight,
        updateHighlight,
        canUndo: history.canUndo,
        canRedo: history.canRedo,
        undo: handleUndo,
        redo: handleRedo,
        // Expose flush for manual saving if needed
        save: forceFlush,
    };
};