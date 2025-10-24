'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { completeCareTask, updateCareTask, deleteCareTask, skipTask } from '@/app/actions/tasks';
import { createNotification } from '@/app/actions/notifications';
import { Button } from '@/components/ui/button';
import type { CareTask, CareTaskType, TaskScheduleMode } from '@/lib/db/types';

interface TaskModalProps {
  task: CareTask & {
    plant: {
      id: string;
      name: string;
      primaryPhotoUrl: string | null;
    };
  };
  isOpen: boolean;
  onClose: () => void;
}

function getTaskIcon(type: string): string {
  const icons: Record<string, string> = {
    water: '💧',
    fertilize: '🌱',
    water_fertilize: '💧🌱',
    mist: '💦',
    repot_check: '🪴',
    prune: '✂️',
    rotate: '🔄',
    custom: '📋',
  };
  return icons[type] || '📋';
}

export function TaskModal({ task, isOpen, onClose }: TaskModalProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine the current schedule mode from task properties
  const getCurrentScheduleMode = (): TaskScheduleMode => {
    if (task.isRecurring && task.recurrencePattern) return 'recurring';
    if (!task.isRecurring && task.nextDueDate) return 'one-time';
    return 'unscheduled';
  };

  // Edit form state
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [editScheduleMode, setEditScheduleMode] = useState<TaskScheduleMode>(getCurrentScheduleMode());
  const [editFrequency, setEditFrequency] = useState(task.recurrencePattern?.frequency || 1);
  const [editUnit, setEditUnit] = useState<'days' | 'weeks' | 'months'>(
    task.recurrencePattern?.unit || 'days'
  );
  const [editDueDate, setEditDueDate] = useState(
    task.nextDueDate && !task.isRecurring ? new Date(task.nextDueDate).toISOString().split('T')[0] : ''
  );

  // Complete form state
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  // Skip form state
  const [showSkipForm, setShowSkipForm] = useState(false);
  const [skipDays, setSkipDays] = useState(1);

  if (!isOpen) return null;

  async function handleComplete() {
    setIsSubmitting(true);
    const result = await completeCareTask(task.id, completionNotes || undefined);
    setIsSubmitting(false);

    if (result.success) {
      setShowCompleteForm(false);
      setCompletionNotes('');
      toast.success(`✅ ${task.title} completed!`, {
        description: `Great job taking care of ${task.plant.name}`,
      });
      router.refresh();
      onClose();
    } else {
      toast.error('Failed to complete task', {
        description: result.error || 'Please try again',
      });
    }
  }

  async function handleSaveEdit() {
    // Validation
    if (editScheduleMode === 'one-time' && !editDueDate) {
      toast.error('Please select a due date for one-time tasks');
      return;
    }

    setIsSubmitting(true);
    const result = await updateCareTask(task.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      scheduleMode: editScheduleMode,
      recurrencePattern: editScheduleMode === 'recurring' ? {
        frequency: editFrequency,
        unit: editUnit,
      } : undefined,
      specificDueDate: editScheduleMode === 'one-time' ? new Date(editDueDate) : undefined,
    });
    setIsSubmitting(false);

    if (result.success) {
      setIsEditing(false);
      toast.success('Task updated successfully');
      router.refresh();
      onClose();
    } else {
      toast.error('Failed to update task', {
        description: result.error || 'Please try again',
      });
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return;

    setIsSubmitting(true);
    const result = await deleteCareTask(task.id);
    setIsSubmitting(false);

    if (result.success) {
      toast.success('Task deleted');
      router.refresh();
      onClose();
    } else {
      toast.error('Failed to delete task', {
        description: result.error || 'Please try again',
      });
    }
  }

  async function handleSkip() {
    setIsSubmitting(true);
    const result = await skipTask(task.id, skipDays);
    setIsSubmitting(false);

    if (result.success) {
      setShowSkipForm(false);
      setSkipDays(1);
      toast.success(`Task postponed ${skipDays} ${skipDays === 1 ? 'day' : 'days'}`, {
        description: `${task.title} rescheduled`,
      });
      router.refresh();
      onClose();
    } else {
      toast.error('Failed to skip task', {
        description: result.error || 'Please try again',
      });
    }
  }

  const dueDate = task.nextDueDate ? new Date(task.nextDueDate) : null;
  const isOverdue = dueDate ? dueDate < new Date() : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-cream rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-cream border-b-2 border-sage p-6">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Content */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <span className="text-3xl flex-shrink-0">{getTaskIcon(task.type)}</span>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-2xl font-bold text-moss-dark border-2 border-sage rounded px-2 py-1"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-moss-dark">{task.title}</h2>
                )}
                <Link
                  href={`/plants/${task.plant.id}`}
                  className="text-moss hover:text-moss-dark text-sm mt-1 inline-block"
                >
                  {task.plant.name} →
                </Link>
              </div>
            </div>

            {/* Right: Plant Image + Close Button */}
            <div className="flex items-start gap-3 flex-shrink-0">
              {/* Plant Image */}
              <div className="w-32 h-32 rounded-lg border-2 border-sage overflow-hidden bg-sage/10 flex items-center justify-center">
                {task.plant.primaryPhotoUrl ? (
                  <img
                    src={task.plant.primaryPhotoUrl}
                    alt={task.plant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl">🪴</span>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="text-soil hover:text-moss-dark transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Schedule Type & Due Date */}
          {isEditing ? (
            <>
              {/* Schedule Mode Toggle in Edit Mode */}
              <div>
                <h3 className="text-sm font-medium text-soil mb-2">Schedule Type</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditScheduleMode('recurring')}
                    className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      editScheduleMode === 'recurring'
                        ? 'border-moss bg-moss text-white'
                        : 'border-sage bg-white text-moss-dark hover:border-moss'
                    }`}
                  >
                    🔄 Recurring
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditScheduleMode('one-time')}
                    className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      editScheduleMode === 'one-time'
                        ? 'border-moss bg-moss text-white'
                        : 'border-sage bg-white text-moss-dark hover:border-moss'
                    }`}
                  >
                    📅 One-time
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditScheduleMode('unscheduled')}
                    className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      editScheduleMode === 'unscheduled'
                        ? 'border-moss bg-moss text-white'
                        : 'border-sage bg-white text-moss-dark hover:border-moss'
                    }`}
                  >
                    ⚪ Unscheduled
                  </button>
                </div>
              </div>

              {/* Conditional Schedule Fields */}
              {editScheduleMode === 'recurring' && (
                <div>
                  <h3 className="text-sm font-medium text-soil mb-2">Recurrence</h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={editFrequency}
                      onChange={(e) => setEditFrequency(parseInt(e.target.value) || 1)}
                      className="w-20 rounded-md border-2 border-sage px-3 py-2"
                    />
                    <select
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value as any)}
                      className="flex-1 rounded-md border-2 border-sage px-3 py-2"
                    >
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                </div>
              )}

              {editScheduleMode === 'one-time' && (
                <div>
                  <h3 className="text-sm font-medium text-soil mb-2">Due Date</h3>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-md border-2 border-sage px-3 py-2"
                  />
                </div>
              )}

              {editScheduleMode === 'unscheduled' && (
                <div className="bg-sage/20 rounded-lg p-3 border-2 border-sage">
                  <p className="text-sm text-moss-dark">
                    This task will have no scheduled due date.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Display Mode */}
              <div>
                <h3 className="text-sm font-medium text-soil mb-2">Schedule Type</h3>
                <p className="text-lg text-moss-dark">
                  {getCurrentScheduleMode() === 'recurring' && '🔄 Recurring'}
                  {getCurrentScheduleMode() === 'one-time' && '📅 One-time'}
                  {getCurrentScheduleMode() === 'unscheduled' && '⚪ Unscheduled'}
                </p>
              </div>

              {task.nextDueDate && dueDate && (
                <div>
                  <h3 className="text-sm font-medium text-soil mb-2">Due Date</h3>
                  <p className={`text-lg font-semibold ${isOverdue ? 'text-red-600' : 'text-moss-dark'}`}>
                    {dueDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    {isOverdue && ' (Overdue)'}
                  </p>
                </div>
              )}

              {task.recurrencePattern && (
                <div>
                  <h3 className="text-sm font-medium text-soil mb-2">Recurrence</h3>
                  <p className="text-lg text-moss-dark">
                    Every {task.recurrencePattern.frequency} {task.recurrencePattern.unit}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-soil mb-2">Notes</h3>
            {isEditing ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                placeholder="Add notes about this task..."
                className="w-full rounded-md border-2 border-sage px-3 py-2 text-moss-dark"
              />
            ) : (
              <p className="text-moss-dark whitespace-pre-wrap">
                {task.description || 'No notes added'}
              </p>
            )}
          </div>

          {/* Last Completed */}
          {task.lastCompletedAt && (
            <div>
              <h3 className="text-sm font-medium text-soil mb-2">Last Completed</h3>
              <p className="text-lg text-moss-dark">
                {new Date(task.lastCompletedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}

          {/* Complete Form */}
          {showCompleteForm && (
            <div className="bg-sage/20 rounded-lg p-4 border-2 border-sage">
              <h3 className="font-semibold text-moss-dark mb-3">Mark as Complete</h3>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={2}
                placeholder="Add any observations or notes..."
                className="w-full rounded-md border-2 border-sage px-3 py-2 text-moss-dark mb-3"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCompleteForm(false);
                    setCompletionNotes('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="bg-moss hover:bg-moss-light text-white"
                >
                  {isSubmitting ? 'Completing...' : 'Complete Task'}
                </Button>
              </div>
            </div>
          )}

          {/* Skip Form */}
          {showSkipForm && (
            <div className="bg-sage/20 rounded-lg p-4 border-2 border-sage">
              <h3 className="font-semibold text-moss-dark mb-3">Skip Task</h3>
              <div className="flex items-center gap-2 mb-3">
                <label className="text-sm text-soil">Postpone by</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={skipDays}
                  onChange={(e) => setSkipDays(parseInt(e.target.value) || 1)}
                  className="w-20 rounded-md border-2 border-sage px-3 py-2"
                />
                <span className="text-sm text-soil">{skipDays === 1 ? 'day' : 'days'}</span>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSkipForm(false);
                    setSkipDays(1);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isSubmitting ? 'Skipping...' : 'Skip Task'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-cream border-t-2 border-sage p-6">
          {isEditing ? (
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditTitle(task.title);
                  setEditDescription(task.description || '');
                  setEditFrequency(task.recurrencePattern?.frequency || 1);
                  setEditUnit(task.recurrencePattern?.unit || 'days');
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isSubmitting || !editTitle.trim()}
                className="bg-moss hover:bg-moss-light text-white"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setShowCompleteForm(true)}
                disabled={showCompleteForm || showSkipForm}
                className="bg-moss hover:bg-moss-light text-white"
              >
                ✓ Complete
              </Button>
              <Button
                onClick={() => setShowSkipForm(true)}
                disabled={showCompleteForm || showSkipForm}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                ⏭ Skip
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                disabled={showCompleteForm || showSkipForm}
              >
                ✎ Edit
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isSubmitting || showCompleteForm || showSkipForm}
                className="text-red-600 border-red-300 hover:bg-red-50 ml-auto"
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
