import { supabase } from '@/lib/supabase';
import type { QueuedOperation } from '@/lib/highlight-queue';
import type { Database } from '@/types/supabase';
import { HighlightColorKey } from '@/constants/highlights';

type HighlightRow = Database['public']['Tables']['highlights']['Row'];

/**
 * Service for batch processing highlight operations
 */
export const highlightBatchService = {
    /**
     * Process a batch of highlight operations
     */
    processBatch: async (operations: QueuedOperation[]) => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No authenticated user');

        // Group operations by type
        const creates = operations.filter(op => op.type === 'create');
        const updates = operations.filter(op => op.type === 'update');
        const deletes = operations.filter(op => op.type === 'delete');

        const results: (HighlightRow & { color: HighlightColorKey })[] = [];

        // Process creates
        if (creates.length > 0) {
            const { data, error } = await supabase
                .from('highlights')
                .insert(
                    creates.map(op => ({
                        ...op.data,
                        user_id: user.id,
                        created_at: new Date(op.timestamp).toISOString(),
                        updated_at: new Date(op.timestamp).toISOString(),
                    }))
                )
                .select();

            if (error) throw error;
            if (data) results.push(...data as (HighlightRow & { color: HighlightColorKey })[]);
        }

        // Process updates
        if (updates.length > 0) {
            await Promise.all(
                updates.map(async op => {
                    const { data, error } = await supabase
                        .from('highlights')
                        .update({
                            ...op.data,
                            updated_at: new Date(op.timestamp).toISOString(),
                        })
                        .eq('id', op.id)
                        .eq('user_id', user.id)
                        .select()
                        .single();

                    if (error) throw error;
                    if (data) results.push(data as HighlightRow & { color: HighlightColorKey });
                })
            );
        }

        // Process deletes (soft delete)
        if (deletes.length > 0) {
            const { error } = await supabase
                .from('highlights')
                .update({
                    is_deleted: true,
                    updated_at: new Date().toISOString()
                })
                .in('id', deletes.map(op => op.id))
                .eq('user_id', user.id);

            if (error) throw error;
        }

        return results;
    },

    /**
     * Get highlights with efficient caching headers
     */
    getHighlights: async (topicId: string, lessonId: string) => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No authenticated user');

        const { data, error } = await supabase
            .from('highlights')
            .select()
            .eq('topic_id', topicId)
            .eq('lesson_id', lessonId)
            .eq('user_id', user.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data as (HighlightRow & { color: HighlightColorKey })[];
    },
};