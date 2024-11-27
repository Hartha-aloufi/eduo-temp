import { HighlightColorKey } from "@/constants/highlights";

export type QueuedOperation = {
    id: string; // Local ID for new highlights, real ID for updates
    type: 'create' | 'update' | 'delete';
    data: {
        topic_id?: string;
        lesson_id?: string;
        element_id?: string;
        start_offset?: number;
        end_offset?: number;
        color?: HighlightColorKey;
        is_deleted?: boolean;
    };
    timestamp: number;
};

/**
 * Queue manager for batching highlight operations
 */
export class HighlightQueue {
    private operations: QueuedOperation[] = [];
    private flushTimeout: NodeJS.Timeout | null = null;
    private isFlushing = false;

    constructor(
        private readonly onFlush: (operations: QueuedOperation[]) => Promise<void>,
        private readonly flushDelay = 2000 // Default delay of 2 seconds
    ) { }

    /**
     * Add operation to queue and schedule flush
     */
    enqueue(operation: QueuedOperation): void {
        // For updates/deletes, remove any pending operations for the same highlight
        if (operation.type !== 'create') {
            this.operations = this.operations.filter(op =>
                op.id !== operation.id || op.type === 'create'
            );
        }

        this.operations.push(operation);
        this.scheduleFlush();
    }

    /**
     * Schedule a flush after delay
     */
    private scheduleFlush(): void {
        if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
        }

        this.flushTimeout = setTimeout(() => {
            this.flush();
        }, this.flushDelay);
    }

    /**
     * Force an immediate flush
     */
    async forceFlush(): Promise<void> {
        if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
            this.flushTimeout = null;
        }
        return this.flush();
    }

    /**
     * Process queued operations
     */
    private async flush(): Promise<void> {
        if (this.isFlushing || this.operations.length === 0) return;

        this.isFlushing = true;
        const operationsToFlush = [...this.operations];
        this.operations = [];

        try {
            await this.onFlush(operationsToFlush);
        } catch (error) {
            // On error, add operations back to queue
            this.operations = [...operationsToFlush, ...this.operations];
            throw error;
        } finally {
            this.isFlushing = false;
            this.flushTimeout = null;

            // If new operations were added during flush, schedule another flush
            if (this.operations.length > 0) {
                this.scheduleFlush();
            }
        }
    }

    /**
     * Clear all pending operations
     */
    clear(): void {
        this.operations = [];
        if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
            this.flushTimeout = null;
        }
    }
}