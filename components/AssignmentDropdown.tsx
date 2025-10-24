'use client';

import { useState, useTransition } from 'react';
import { UserCircle, Check } from 'lucide-react';
import { assignPlantToUser } from '@/app/actions/plants';
import { assignTaskToUser } from '@/app/actions/tasks';
import { toast } from 'sonner';

interface User {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl?: string;
}

interface AssignmentDropdownProps {
  type: 'plant' | 'task';
  itemId: string;
  itemName: string;
  currentAssignedUserId: string | null;
  groupMembers: User[];
  onAssignmentChanged?: () => void;
}

export function AssignmentDropdown({
  type,
  itemId,
  itemName,
  currentAssignedUserId,
  groupMembers,
  onAssignmentChanged,
}: AssignmentDropdownProps) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const handleAssign = (userId: string | null) => {
    startTransition(async () => {
      const result = type === 'plant'
        ? await assignPlantToUser(itemId, userId)
        : await assignTaskToUser(itemId, userId);

      if (result.success) {
        const assignedUser = userId ? groupMembers.find(m => m.id === userId) : null;
        const assigneeName = assignedUser
          ? (assignedUser.firstName || assignedUser.email)
          : 'Unassigned';

        toast.success(`${itemName} assigned to ${assigneeName}`);
        setIsOpen(false);
        onAssignmentChanged?.();
      } else {
        toast.error(result.error || 'Failed to update assignment');
      }
    });
  };

  const currentAssignee = currentAssignedUserId
    ? groupMembers.find(m => m.id === currentAssignedUserId)
    : null;

  const displayName = currentAssignee
    ? (currentAssignee.firstName || currentAssignee.email.split('@')[0])
    : 'Unassigned';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md border-2 border-sage bg-card-bg text-sm text-moss-dark hover:border-moss transition-colors"
        disabled={isPending}
      >
        <UserCircle className="w-4 h-4" />
        <span>{displayName}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full mt-2 left-0 z-20 w-64 rounded-lg border-2 border-sage bg-card-bg shadow-lg overflow-hidden">
            <div className="p-2">
              <p className="text-xs font-semibold text-soil uppercase px-2 py-1">
                Assign To
              </p>

              {/* Unassigned Option */}
              <button
                onClick={() => handleAssign(null)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-sage/20 transition-colors text-left"
                disabled={isPending}
              >
                <span className="text-sm text-soil italic">Unassigned</span>
                {!currentAssignedUserId && (
                  <Check className="w-4 h-4 text-moss" />
                )}
              </button>

              {/* Member Options */}
              {groupMembers.map((member) => {
                const name = member.firstName && member.lastName
                  ? `${member.firstName} ${member.lastName}`
                  : member.firstName || member.email.split('@')[0];

                const isSelected = member.id === currentAssignedUserId;

                return (
                  <button
                    key={member.id}
                    onClick={() => handleAssign(member.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-sage/20 transition-colors"
                    disabled={isPending}
                  >
                    <div className="flex items-center gap-2">
                      {member.imageUrl ? (
                        <img
                          src={member.imageUrl}
                          alt={name}
                          className="w-6 h-6 rounded-full border border-sage"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-sage/30 flex items-center justify-center">
                          <span className="text-xs text-moss-dark">
                            {name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="text-left">
                        <p className="text-sm text-moss-dark">{name}</p>
                        <p className="text-xs text-soil">{member.email}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-moss" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
