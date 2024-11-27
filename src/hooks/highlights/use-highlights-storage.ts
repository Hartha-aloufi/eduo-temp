import { useCallback } from "react";
import { TextHighlight } from "@/types/highlight";
import { useSession } from "@/hooks/use-auth-query";
import {
  useLessonHighlights,
  useCreateHighlight,
  useDeleteHighlight,
  useUpdateHighlight,
} from "./use-highlight-sync";
import { HighlightColorKey } from "@/constants/highlights";
import { useHighlightHistory } from "./use-highlight-history";
import { toast } from "sonner";

export const useHighlightStorage = (
  topicId: string,
  lessonId: string,
  activeColor: HighlightColorKey
) => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.data.session;
  const history = useHighlightHistory();

  // Supabase queries and mutations
  const { data: highlights = [], isLoading: isLoadingHighlights } =
    useLessonHighlights(topicId, lessonId);
  const { mutate: createHighlight, isPending: isCreating } =
    useCreateHighlight();
  const { mutate: deleteHighlight, isPending: isDeleting } =
    useDeleteHighlight();
  const { mutate: updateHighlight, isPending: isUpdating } =
    useUpdateHighlight();

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

      const highlight = {
        topic_id: topicId,
        lesson_id: lessonId,
        start_offset: info.startOffset,
        end_offset: info.endOffset,
        element_id: info.elementId,
        color: activeColor,
      };

      createHighlight(highlight, {
        onSuccess: (newHighlight) => {
          if (!info.skipHistory) {
            history.recordAdd({
              id: newHighlight.id,
              startOffset: newHighlight.start_offset,
              endOffset: newHighlight.end_offset,
              elementId: newHighlight.element_id,
              color: newHighlight.color as HighlightColorKey,
              createdAt: newHighlight.created_at,
              text: info.text,
            });
          }
          toast.success("تم إضافة التظليل");
        },
      });
    },
    [isAuthenticated, createHighlight, topicId, lessonId, activeColor, history]
  );

  const removeHighlight = useCallback(
    async (id: string, skipHistory = false) => {
      if (!isAuthenticated) {
        toast.error("يجب تسجيل الدخول لحذف التظليل");
        return;
      }

      const highlight = highlights.find((h) => h.id === id);
      if (!highlight) return;

      deleteHighlight(id, {
        onSuccess: () => {
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
          toast.success("تم حذف التظليل");
        },
      });
    },
    [isAuthenticated, deleteHighlight, highlights, history]
  );

  const updateHighlightOptions = useCallback(
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

      updateHighlight(
        { id, ...options },
        {
          onSuccess: (updatedHighlight) => {
            if (!skipHistory) {
              history.recordUpdate(
                {
                  id: updatedHighlight.id,
                  startOffset: updatedHighlight.start_offset,
                  endOffset: updatedHighlight.end_offset,
                  elementId: updatedHighlight.element_id,
                  color: updatedHighlight.color as HighlightColorKey,
                  createdAt: updatedHighlight.created_at,
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
            toast.success("تم تحديث التظليل");
          },
        }
      );
    },
    [isAuthenticated, updateHighlight, highlights, history]
  );

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
          await updateHighlightOptions(
            action.highlight.id,
            { color: action.previousHighlight.color },
            true
          );
        }
        break;
    }
  }, [history, removeHighlight, addHighlight, updateHighlightOptions]);

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
        await updateHighlightOptions(
          action.highlight.id,
          { color: action.highlight.color },
          true
        );
        break;
    }
  }, [history, removeHighlight, addHighlight, updateHighlightOptions]);

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
    isLoading: isLoadingHighlights || isCreating || isDeleting || isUpdating,
    addHighlight,
    removeHighlight,
    updateHighlight: updateHighlightOptions,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    undo: handleUndo,
    redo: handleRedo,
  };
};
