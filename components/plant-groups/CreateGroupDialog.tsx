'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { createPlantGroup } from '@/app/actions/plant-groups';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface CreateGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGroupDialog({ isOpen, onClose }: CreateGroupDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Group name is required');
      return;
    }

    if (name.length > 50) {
      toast.error('Group name must be 50 characters or less');
      return;
    }

    if (description.length > 200) {
      toast.error('Description must be 200 characters or less');
      return;
    }

    startTransition(async () => {
      const result = await createPlantGroup(name.trim(), description.trim() || undefined);

      if (result.success) {
        toast.success(`Group "${name}" created successfully!`);
        setName('');
        setDescription('');
        onClose();
        if (result.data) {
          router.push(`/groups/${result.data.id}`);
        }
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to create group');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-soil/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-lg border-2 border-sage bg-card-bg p-6 shadow-xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-soil hover:text-moss-dark transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <h2 className="text-2xl font-semibold text-moss-dark mb-4">
          Create Plant Group
        </h2>
        <p className="text-sm text-soil mb-6">
          Invite friends or family to collaborate on plant care together.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-moss-dark mb-2">
              Group Name <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Family Garden, Office Plants"
              maxLength={50}
              className="w-full px-4 py-2 rounded-md border-2 border-sage bg-cream text-moss-dark placeholder-soil/50 focus:outline-none focus:border-moss transition-colors"
              required
            />
            <p className="text-xs text-soil mt-1">{name.length}/50 characters</p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-moss-dark mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional: What's this group for?"
              maxLength={200}
              rows={3}
              className="w-full px-4 py-2 rounded-md border-2 border-sage bg-cream text-moss-dark placeholder-soil/50 focus:outline-none focus:border-moss transition-colors resize-none"
            />
            <p className="text-xs text-soil mt-1">{description.length}/200 characters</p>
          </div>

          <div className="bg-sage/10 p-4 rounded-md">
            <p className="text-xs text-soil">
              <strong>Note:</strong> Groups can have up to 5 members (Clerk Free plan limit).
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-moss hover:bg-moss-light text-white"
              disabled={isPending}
            >
              {isPending ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
