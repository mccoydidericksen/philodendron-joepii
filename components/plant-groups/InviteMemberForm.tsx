'use client';

import { useState, useTransition } from 'react';
import { Mail } from 'lucide-react';
import { inviteMemberToGroup } from '@/app/actions/plant-groups';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface InviteMemberFormProps {
  groupId: string;
  memberCount: number;
  pendingInvitationCount: number;
  onInviteSent?: () => void;
}

export function InviteMemberForm({ groupId, memberCount, pendingInvitationCount, onInviteSent }: InviteMemberFormProps) {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');

  const totalSlotsUsed = memberCount + pendingInvitationCount;
  const isFull = totalSlotsUsed >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    startTransition(async () => {
      const result = await inviteMemberToGroup(groupId, email.trim());

      if (result.success) {
        toast.success(`Invitation sent to ${email}`);
        setEmail('');
        onInviteSent?.();
      } else {
        toast.error(result.error || 'Failed to send invitation');
      }
    });
  };

  return (
    <div className="rounded-lg border-2 border-sage bg-card-bg p-6">
      <h3 className="text-lg font-semibold text-moss-dark mb-4">
        Invite Members
      </h3>

      {isFull ? (
        <div className="bg-warning/10 border-2 border-warning rounded-md p-4">
          <p className="text-sm text-soil">
            <strong>Group is full ({totalSlotsUsed}/5 members)</strong>
            <br />
            Remove a member before inviting new ones.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-moss-dark mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-soil/50" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@example.com"
                className="w-full pl-11 pr-4 py-2 rounded-md border-2 border-sage bg-cream text-moss-dark placeholder-soil/50 focus:outline-none focus:border-moss transition-colors"
                disabled={isPending}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-moss hover:bg-moss-light text-white"
            disabled={isPending || isFull}
          >
            {isPending ? 'Sending...' : 'Send Invitation'}
          </Button>

          <p className="text-xs text-soil">
            The invitee will receive an email with a link to join this group.
            They'll need to create an account if they don't have one.
          </p>
        </form>
      )}
    </div>
  );
}
