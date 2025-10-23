'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createCareTask, getTaskDefaults } from '@/app/actions/tasks';
import { Button } from '@/components/ui/button';
import type { CareTaskType } from '@/lib/db/types';

interface TaskFormProps {
  plantId: string;
  onSuccess?: () => void;
}

const PRESET_TASKS: Array<{
  type: CareTaskType;
  icon: string;
  label: string;
}> = [
  { type: 'water', icon: '💧', label: 'Water' },
  { type: 'fertilize', icon: '🌱', label: 'Fertilize' },
  { type: 'mist', icon: '💦', label: 'Mist' },
  { type: 'repot_check', icon: '🪴', label: 'Repot' },
];

export function TaskForm({ plantId, onSuccess }: TaskFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<CareTaskType | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState(1);
  const [unit, setUnit] = useState<'days' | 'weeks' | 'months'>('days');

  async function handlePresetSelect(type: CareTaskType) {
    const defaults = await getTaskDefaults(type);
    setSelectedType(type);
    setIsCustom(false);
    setTitle(defaults.title);
    setFrequency(defaults.frequency);
    setUnit(defaults.unit);
    setIsOpen(true);
  }

  function handleCustomSelect() {
    setSelectedType('custom');
    setIsCustom(true);
    setTitle('');
    setDescription('');
    setFrequency(7);
    setUnit('days');
    setIsOpen(true);
  }

  function handleCancel() {
    setIsOpen(false);
    setSelectedType(null);
    setIsCustom(false);
    setTitle('');
    setDescription('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createCareTask({
        plantId,
        type: selectedType,
        title: title.trim(),
        description: description.trim() || undefined,
        recurrencePattern: {
          frequency,
          unit,
        },
      });

      if (result.success) {
        toast.success(`📋 ${title} task created!`, {
          description: "You'll be reminded when it's due",
        });
        handleCancel();
        onSuccess?.();
        router.refresh();
      } else {
        setError(result.error || 'Failed to create task');
        toast.error('Failed to create task', {
          description: result.error || 'Please try again',
        });
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          {PRESET_TASKS.map((task) => (
            <button
              key={task.type}
              onClick={() => handlePresetSelect(task.type)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-sage bg-card-bg hover:border-moss hover:bg-sage/20 transition-all"
            >
              <span className="text-2xl">{task.icon}</span>
              <span className="font-medium text-moss-dark">{task.label}</span>
            </button>
          ))}
          <button
            onClick={handleCustomSelect}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-sage bg-card-bg hover:border-moss hover:bg-sage/20 transition-all"
          >
            <span className="text-2xl">✏️</span>
            <span className="font-medium text-moss-dark">Custom</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border-2 border-sage bg-card-bg p-6">
      <h3 className="text-xl font-semibold text-moss-dark mb-4">
        {isCustom ? 'Create Custom Task' : `Add ${title} Task`}
      </h3>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border-2 border-red-200 p-3 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Title (editable for custom tasks) */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-soil mb-1">
            Task Name <span className="text-terracotta">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            readOnly={!isCustom}
            className={`w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none ${
              !isCustom ? 'bg-gray-50 cursor-not-allowed' : ''
            }`}
          />
        </div>

        {/* Frequency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="frequency" className="block text-sm font-medium text-soil mb-1">
              Every
            </label>
            <input
              type="number"
              id="frequency"
              min="1"
              value={frequency}
              onChange={(e) => setFrequency(parseInt(e.target.value) || 1)}
              required
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-soil mb-1">
              Period
            </label>
            <select
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value as any)}
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-soil mb-1">
            Notes (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add any notes about this task..."
            className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="bg-moss hover:bg-moss-light text-white"
          >
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </div>
    </form>
  );
}
