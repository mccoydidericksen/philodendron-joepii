'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Settings, LogOut, Trash2, Crown, Mail, X } from 'lucide-react';
import {
  getGroupMembers,
  getPendingInvitations,
  removeMember,
  leaveGroup,
  deletePlantGroup,
  revokeInvitation,
} from '@/app/actions/plant-groups';
import { InviteMemberForm } from './InviteMemberForm';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface GroupMember {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  role: 'admin' | 'member';
}

interface PendingInvitation {
  id: string;
  email: string;
  createdAt: number;
}

interface GroupDetailClientProps {
  groupId: string;
  groupName: string;
  description: string | null;
  userRole: 'admin' | 'member';
  currentUserId: string;
}

export function GroupDetailClient({
  groupId,
  groupName,
  description,
  userRole,
  currentUserId,
}: GroupDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  // Calculate actual member count from loaded data
  const actualMemberCount = members.length;
  const totalSlotsUsed = actualMemberCount + invitations.length;

  const loadMembersAndInvitations = async () => {
    setIsLoadingMembers(true);

    const membersResult = await getGroupMembers(groupId);
    if (membersResult.success) {
      setMembers(membersResult.data as GroupMember[]);
    }

    if (userRole === 'admin') {
      const invitesResult = await getPendingInvitations(groupId);
      if (invitesResult.success) {
        setInvitations(invitesResult.data as PendingInvitation[]);
      }
    }

    setIsLoadingMembers(false);
  };

  useEffect(() => {
    loadMembersAndInvitations();
  }, [groupId, userRole]);

  const handleRemoveMember = (memberId: string, memberEmail: string) => {
    if (!confirm(`Remove ${memberEmail} from this group?`)) {
      return;
    }

    startTransition(async () => {
      const result = await removeMember(groupId, memberId);
      if (result.success) {
        toast.success('Member removed');
        loadMembersAndInvitations();
      } else {
        toast.error(result.error || 'Failed to remove member');
      }
    });
  };

  const handleRevokeInvitation = (invitationId: string, email: string) => {
    if (!confirm(`Revoke invitation for ${email}?`)) {
      return;
    }

    startTransition(async () => {
      const result = await revokeInvitation(groupId, invitationId);
      if (result.success) {
        toast.success('Invitation revoked');
        loadMembersAndInvitations();
      } else {
        toast.error(result.error || 'Failed to revoke invitation');
      }
    });
  };

  const handleLeaveGroup = () => {
    if (!confirm('Are you sure you want to leave this group?')) {
      return;
    }

    startTransition(async () => {
      const result = await leaveGroup(groupId);
      if (result.success) {
        toast.success('You have left the group');
        router.push('/groups');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to leave group');
      }
    });
  };

  const handleDeleteGroup = () => {
    if (!confirm(`Permanently delete "${groupName}" and all its data? This cannot be undone.`)) {
      return;
    }

    startTransition(async () => {
      const result = await deletePlantGroup(groupId);
      if (result.success) {
        toast.success('Group deleted');
        router.push('/groups');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete group');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Group Header */}
      <div className="rounded-lg border-2 border-sage bg-card-bg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-grow">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-moss-dark" style={{ fontFamily: 'var(--font-fredoka)' }}>{groupName}</h1>
              {userRole === 'admin' && (
                <span className="px-3 py-1 text-sm font-medium rounded-md bg-moss/20 text-moss">
                  <Crown className="w-3 h-3 inline mr-1" />
                  Admin
                </span>
              )}
            </div>
            {description && (
              <p className="text-sage-dark text-sm">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm text-soil">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{actualMemberCount} {actualMemberCount === 1 ? 'member' : 'members'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap gap-3">
          {userRole === 'admin' ? (
            <Button
              onClick={handleDeleteGroup}
              variant="outline"
              className="text-danger border-danger hover:bg-danger hover:text-white"
              disabled={isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Group
            </Button>
          ) : (
            <Button
              onClick={handleLeaveGroup}
              variant="outline"
              disabled={isPending}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave Group
            </Button>
          )}
        </div>
      </div>

      {/* Invite Section (Admin Only) */}
      {userRole === 'admin' && (
        <InviteMemberForm
          groupId={groupId}
          memberCount={actualMemberCount}
          pendingInvitationCount={invitations.length}
          onInviteSent={loadMembersAndInvitations}
        />
      )}

      {/* Pending Invitations (Admin Only) */}
      {userRole === 'admin' && invitations.length > 0 && (
        <div className="rounded-lg border-2 border-sage bg-card-bg p-6">
          <h3 className="text-lg font-semibold text-moss-dark mb-4">
            Pending Invitations
          </h3>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 rounded-md bg-sage/10"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-soil" />
                  <div>
                    <p className="text-sm font-medium text-moss-dark">{invitation.email}</p>
                    <p className="text-xs text-soil">
                      Invited {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleRevokeInvitation(invitation.id, invitation.email)}
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="rounded-lg border-2 border-sage bg-card-bg p-6">
        <h3 className="text-lg font-semibold text-moss-dark mb-4">
          Members
        </h3>

        {isLoadingMembers ? (
          <p className="text-sm text-soil">Loading members...</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const isCurrentUser = member.userId === currentUserId;
              const displayName = member.firstName && member.lastName
                ? `${member.firstName} ${member.lastName}`
                : member.firstName || member.email;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-md bg-sage/10"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={member.imageUrl}
                      alt={displayName}
                      className="w-10 h-10 rounded-full border-2 border-sage"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-moss-dark">
                          {displayName}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-soil">(You)</span>
                          )}
                        </p>
                        {member.role === 'admin' && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-moss/20 text-moss">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-soil">{member.email}</p>
                    </div>
                  </div>

                  {userRole === 'admin' && !isCurrentUser && (
                    <Button
                      onClick={() => handleRemoveMember(member.userId, member.email)}
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
