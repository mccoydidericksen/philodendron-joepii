'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Plus } from 'lucide-react';
import { getMyPlantGroups } from '@/app/actions/plant-groups';
import { Button } from '@/components/ui/button';
import { CreateGroupDialog } from './CreateGroupDialog';

interface PlantGroup {
  id: string;
  name: string;
  description: string | null;
  role: 'admin' | 'member';
  memberCount: number;
  createdAt: Date;
}

export function PlantGroupsList() {
  const [groups, setGroups] = useState<PlantGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    async function loadGroups() {
      const result = await getMyPlantGroups();
      if (result.success) {
        setGroups(result.data as PlantGroup[]);
      }
      setIsLoading(false);
    }

    loadGroups();
  }, [showCreateDialog]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-soil">Loading groups...</div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-end">
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-moss hover:bg-moss-light text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border-2 border-sage bg-card-bg p-12 text-center">
          <div className="mx-auto max-w-md">
            <div className="w-16 h-16 rounded-full bg-sage/20 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-sage" />
            </div>
            <h3 className="text-xl font-semibold text-moss-dark mb-2">
              No Groups Yet
            </h3>
            <p className="text-soil mb-6">
              Create a plant group to share plants and collaborate on care with friends or family.
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-moss hover:bg-moss-light text-white"
            >
              Create Your First Group
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="group rounded-lg border-2 border-sage bg-card-bg p-6 transition-all hover:border-moss hover:shadow-lg"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-semibold text-moss-dark group-hover:text-moss transition-colors">
                  {group.name}
                </h3>
                {group.role === 'admin' && (
                  <span className="px-2 py-1 text-xs font-medium rounded-md bg-moss/20 text-moss">
                    Admin
                  </span>
                )}
              </div>

              {group.description && (
                <p className="text-sm text-soil mb-4 line-clamp-2">
                  {group.description}
                </p>
              )}

              <div className="flex items-center gap-2 text-sm text-soil">
                <Users className="w-4 h-4" />
                <span>
                  {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateGroupDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </>
  );
}
