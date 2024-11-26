// src/hooks/highlights/use-highlights-storage.ts

import { useCallback } from 'react';
import { TextHighlight } from "@/types/highlight";
import { useSession } from '@/hooks/use-auth-query';
import {
    useLessonHighlights,
    useCreateHighlight,
    useDeleteHighlight,
    useUpdateHighlight
} from './use-highlight-sync';
import { HighlightColorKey } from '@/constants/highlights';
import { useHighlightHistory } from './use-highlight-history';
import { toast } from 'sonner';

/**
 * Hook to manage highlights for authenticated users with update support and undo/redo functionality
 * @param topicId - The ID of the current topic
 * @param lessonId - The ID of the current lesson
 * @param activeColor - The currently selected highlight color
 */
export const useHighlightStorage = (
    topicId: string,
    lessonId: string,
    activeColor: HighlightColorKey
) => {
    const { data: session } = useSession();
    const isAuthenticated = !!session?.data.session;

    // History management
    const history = useHighlightHistory();

    // Supabase queries and mutations
    const {
        data: highlights = [],
        isLoading: isLoadingHighlights
    } = useLessonHighlights(topicId, lessonId);

    const {
        mutate: createHighlight,
        isPending: isCreating
    } = useCreateHighlight();

    const {
        mutate: deleteHighlight,
        isPending: isDeleting
    } = useDeleteHighlight();

    const {
        mutate: updateHighlight,
        isPending: isUpdating
    } = useUpdateHighlight();

    /**
     * Add new highlight with history tracking
     */
    const addHighlight = useCallback(async (info: {
        text: string,
        startOffset: number;
        endOffset: number;
        elementId: string;
    }) => {
        if (!isAuthenticated) {
            toast.error('يجب تسجيل الدخول لإضافة تظليل');
            return;
        }

        const highlight = {
            topic_id: topicId,
            lesson_id: lessonId,
            start_offset: info.startOffset,
            end_offset: info.endOffset,
            element_id: info.elementId,
            color: activeColor
        };

        createHighlight(highlight, {
            onSuccess: (newHighlight) => {
                history.recordAdd({
                    id: newHighlight.id,
                    startOffset: newHighlight.start_offset,
                    endOffset: newHighlight.end_offset,
                    elementId: newHighlight.element_id,
                    color: newHighlight.color as HighlightColorKey,
                    createdAt: newHighlight.created_at,
                    text: info.text
                });
                toast.success('تم إضافة التظليل');
            },
            onError: () => {
                toast.error('فشل إضافة التظليل');
            }
        });
    }, [isAuthenticated, createHighlight, topicId, lessonId, activeColor, history]);

    /**
     * Remove highlight with history tracking
     */
    const removeHighlight = useCallback(async (id: string) => {
        if (!isAuthenticated) {
            toast.error('يجب تسجيل الدخول لحذف التظليل');
            return;
        }

        const highlight = highlights.find(h => h.id === id);
        if (!highlight) return;

        deleteHighlight(id, {
            onSuccess: () => {
                history.recordRemove({
                    id: highlight.id,
                    startOffset: highlight.start_offset,
                    endOffset: highlight.end_offset,
                    elementId: highlight.element_id,
                    color: highlight.color as HighlightColorKey,
                    createdAt: highlight.created_at
                });
                toast.success('تم حذف التظليل');
            },
            onError: () => {
                toast.error('فشل حذف التظليل');
            }
        });
    }, [isAuthenticated, deleteHighlight, highlights, history]);

    /**
     * Update highlight with history tracking
     */
    const updateHighlightOptions = useCallback(async (id: string, options: { color: HighlightColorKey }) => {
        if (!isAuthenticated) {
            toast.error('يجب تسجيل الدخول لتعديل التظليل');
            return;
        }

        const highlight = highlights.find(h => h.id === id);
        if (!highlight) return;

        const previousHighlight = {
            id: highlight.id,
            startOffset: highlight.start_offset,
            endOffset: highlight.end_offset,
            elementId: highlight.element_id,
            color: highlight.color as HighlightColorKey,
            createdAt: highlight.created_at
        };

        updateHighlight(
            { id, ...options },
            {
                onSuccess: (updatedHighlight) => {
                    history.recordUpdate(
                        {
                            id: updatedHighlight.id,
                            startOffset: updatedHighlight.start_offset,
                            endOffset: updatedHighlight.end_offset,
                            elementId: updatedHighlight.element_id,
                            color: updatedHighlight.color as HighlightColorKey,
                            createdAt: updatedHighlight.created_at
                        },
                        previousHighlight
                    );
                    toast.success('تم تحديث التظليل');
                },
                onError: () => {
                    toast.error('فشل تحديث التظليل');
                }
            }
        );
    }, [isAuthenticated, updateHighlight, highlights, history]);

    /**
     * Handle undo operation
     */
    const handleUndo = useCallback(async () => {
        const action = history.undo();
        if (!action) return;

        switch (action.type) {
            case 'ADD':
                await removeHighlight(action.highlight.id);
                break;
            case 'REMOVE':
                await addHighlight({
                    text: action.highlight.text || '',
                    startOffset: action.highlight.startOffset,
                    endOffset: action.highlight.endOffset,
                    elementId: action.highlight.elementId
                });
                break;
            case 'UPDATE':
                if (action.previousHighlight) {
                    await updateHighlightOptions(action.highlight.id, {
                        color: action.previousHighlight.color
                    });
                }
                break;
        }
    }, [history, removeHighlight, addHighlight, updateHighlightOptions]);

    /**
     * Handle redo operation
     */
    const handleRedo = useCallback(async () => {
        const action = history.redo();
        if (!action) return;

        switch (action.type) {
            case 'ADD':
                await addHighlight({
                    text: action.highlight.text || '',
                    startOffset: action.highlight.startOffset,
                    endOffset: action.highlight.endOffset,
                    elementId: action.highlight.elementId
                });
                break;
            case 'REMOVE':
                await removeHighlight(action.highlight.id);
                break;
            case 'UPDATE':
                await updateHighlightOptions(action.highlight.id, {
                    color: action.highlight.color
                });
                break;
        }
    }, [history, removeHighlight, addHighlight, updateHighlightOptions]);

    // Format highlights for rendering
    const formattedHighlights: TextHighlight[] = highlights.map(h => ({
        id: h.id,
        text: '', // Will be populated from DOM
        startOffset: h.start_offset,
        endOffset: h.end_offset,
        elementId: h.element_id,
        color: h.color as HighlightColorKey,
        createdAt: h.created_at
    }));

    return {
        highlights: formattedHighlights,
        isLoading: isLoadingHighlights || isCreating || isDeleting || isUpdating,
        addHighlight,
        removeHighlight,
        updateHighlight: updateHighlightOptions,
        canUndo: history.canUndo,
        canRedo: history.canRedo,
        undo: handleUndo,
        redo: handleRedo
    };
};