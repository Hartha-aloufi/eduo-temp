import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { HighlightQueue, QueuedOperation } from '@/lib/highlight-queue';
import { highlightBatchService } from '@/services/highlight-batch.service';
import { useSession } from '@/hooks/use-auth-query';
import { HIGHLIGHT_KEYS } from './use-highlight-sync';
import { toast } from 'sonner';

/**
 * Hook to manage highlight operation queuing
 */
export const useHighlightQueue = (topicId: string, lessonId: string) => {
    const { data: session } = useSession();
    const queryClient = useQueryClient();
    const queueRef = useRef<HighlightQueue | null>(null);

    // Mutation for processing batched operations
    const { mutateAsync: processBatch } = useMutation({
        mutationFn: highlightBatchService.processBatch,
        onSuccess: (results) => {
            // Update cache with real IDs and data
            queryClient.setQueryData(
                HIGHLIGHT_KEYS.lesson(topicId, lessonId),
                (old: any[] = []) => {
                    // Remove temporary items and add real ones
                    const filtered = old.filter(h => !h.id.startsWith('temp-'));
                    return [...filtered, ...results];
                }
            );
            toast.success('تم حفظ التغييرات');
        },
        onError: (error) => {
            console.error('Failed to process highlight batch:', error);
            toast.error('فشل حفظ التغييرات');
        },
    });

    // Initialize queue
    useEffect(() => {
        if (!queueRef.current) {
            queueRef.current = new HighlightQueue(processBatch);
        }

        return () => {
            // Force flush on unmount
            queueRef.current?.forceFlush().catch(console.error);
        };
    }, [processBatch]);

    // Queue operation handler
    const queueOperation = useCallback((operation: Omit<QueuedOperation, 'timestamp'>) => {
        if (!queueRef.current || !session?.data.session) return;

        const timestampedOperation = {
            ...operation,
            timestamp: Date.now(),
        };

        // Optimistically update cache
        queryClient.setQueryData(
            HIGHLIGHT_KEYS.lesson(topicId, lessonId),
            (old: any[] = []) => {
                switch (operation.type) {
                    case 'create':
                        return [...old, { id: operation.id, ...operation.data }];
                    case 'update':
                        return old.map(h =>
                            h.id === operation.id ? { ...h, ...operation.data } : h
                        );
                    case 'delete':
                        return old.filter(h => h.id !== operation.id);
                    default:
                        return old;
                }
            }
        );

        queueRef.current.enqueue(timestampedOperation);
    }, [queryClient, session, topicId, lessonId]);

    // Force flush handler
    const forceFlush = useCallback(async () => {
        if (!queueRef.current) return;
        return queueRef.current.forceFlush();
    }, []);

    return {
        queueOperation,
        forceFlush,
    };
};