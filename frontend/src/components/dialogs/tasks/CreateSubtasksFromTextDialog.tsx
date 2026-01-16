import { useState, useMemo } from 'react';
import NiceModal from '@ebay/nice-modal-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import { useTranslation } from 'react-i18next';
import type { CreateTask } from 'shared/types';

interface CreateSubtasksFromTextDialogProps {
  projectId: string;
  sourceTaskId: string;
  text: string;
}

// Parse text into list items (handles various formats: -, *, •, numbers, etc.)
function parseSubtasks(text: string): string[] {
  const lines = text.split('\n');
  const subtasks: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and headers
    if (!trimmed || /^(Subtasks|Tasks|Create|Would you|^[A-Z][a-z]+ for|^##|^#)/.test(trimmed)) {
      continue;
    }

    // Match lines starting with -, *, •, digits, or indented text
    const match = trimmed.match(/^[\-\*•\d+.)\s]+(.*?)$/);
    if (match && match[1]) {
      const item = match[1].trim();
      if (item.length > 5 && item.length < 200) {
        // Filter out questions and meta text
        if (!/^\?|^Would|^Or |^If you|^Please|^Let me/.test(item)) {
          subtasks.push(item);
        }
      }
    }
  }

  return subtasks;
}

const CreateSubtasksFromTextDialogImpl = NiceModal.create<
  CreateSubtasksFromTextDialogProps
>(({ projectId, sourceTaskId, text }) => {
  const modal = NiceModal.useModal();
  const { t } = useTranslation(['tasks', 'common']);
  const { createTask } = useTaskMutations(projectId);

  const subtasks = useMemo(() => parseSubtasks(text), [text]);
  const [selected, setSelected] = useState<Set<number>>(
    new Set(subtasks.map((_, i) => i))
  );
  const [creating, setCreating] = useState(false);

  const toggleSubtask = (index: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelected(newSelected);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      for (const index of Array.from(selected)) {
        const title = subtasks[index];
        const payload: CreateTask = {
          project_id: projectId,
          title,
          description: null,
          status: null,
          parent_workspace_id: null,
          image_ids: null,
          shared_task_id: null,
        };
        await createTask.mutateAsync(payload);
      }
      modal.resolve({ created: selected.size });
    } catch (err) {
      console.error('Failed to create subtasks', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={modal.visible} onOpenChange={(open) => !open && modal.hide()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create subtasks from analysis</DialogTitle>
          <DialogDescription>
            Select which items to create as tasks
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {subtasks.map((subtask, index) => (
            <div key={index} className="flex items-start gap-3 p-2 rounded hover:bg-accent">
              <Checkbox
                id={`subtask-${index}`}
                checked={selected.has(index)}
                onCheckedChange={() => toggleSubtask(index)}
                className="mt-1"
              />
              <label
                htmlFor={`subtask-${index}`}
                className="flex-1 text-sm cursor-pointer text-foreground"
              >
                {subtask}
              </label>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => modal.hide()}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={selected.size === 0 || creating}
          >
            {creating ? 'Creating...' : `Create ${selected.size} tasks`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export const CreateSubtasksFromTextDialog = NiceModal.create(
  CreateSubtasksFromTextDialogImpl
);
