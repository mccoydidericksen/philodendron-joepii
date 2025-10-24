'use client';

import { X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AssignableUser {
  id: string;
  name: string;
  email: string;
}

interface PlantFiltersProps {
  // Filter values
  searchQuery: string;
  speciesFilter: string;
  locationFilter: string;
  assigneeFilter: string;

  // Filter options
  speciesOptions: string[];
  locationOptions: string[];
  assigneeOptions: AssignableUser[];

  // Change handlers
  onSearchChange: (value: string) => void;
  onSpeciesChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onClearFilters: () => void;
}

export function PlantFilters({
  searchQuery,
  speciesFilter,
  locationFilter,
  assigneeFilter,
  speciesOptions,
  locationOptions,
  assigneeOptions,
  onSearchChange,
  onSpeciesChange,
  onLocationChange,
  onAssigneeChange,
  onClearFilters,
}: PlantFiltersProps) {
  const hasActiveFilters =
    searchQuery !== '' || speciesFilter !== 'all' || locationFilter !== 'all' || assigneeFilter !== 'all';

  return (
    <div className="mb-6 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-soil" />
        <Input
          type="text"
          placeholder="Search by plant name or species..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 hover:border-moss-light transition-colors"
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {/* Species Type Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-soil mb-2 block">
            Filter by Species Type
          </label>
          <select
            value={speciesFilter}
            onChange={(e) => onSpeciesChange(e.target.value)}
            className="w-full rounded-md border-2 border-sage bg-white px-4 py-2 text-moss-dark focus:border-moss focus:outline-none cursor-pointer hover:border-moss-light transition-colors"
          >
            <option value="all">All Plants</option>
            {speciesOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Location Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-soil mb-2 block">Location</label>
          <select
            value={locationFilter}
            onChange={(e) => onLocationChange(e.target.value)}
            className="w-full rounded-md border-2 border-sage bg-white px-4 py-2 text-moss-dark focus:border-moss focus:outline-none cursor-pointer hover:border-moss-light transition-colors"
          >
            <option value="all">All Locations</option>
            {locationOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Assignee Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-soil mb-2 block">Assigned To</label>
          <select
            value={assigneeFilter}
            onChange={(e) => onAssigneeChange(e.target.value)}
            className="w-full rounded-md border-2 border-sage bg-white px-4 py-2 text-moss-dark focus:border-moss focus:outline-none cursor-pointer hover:border-moss-light transition-colors"
          >
            <option value="all">All Users</option>
            <option value="me">Me</option>
            <option value="unassigned">Unassigned</option>
            {assigneeOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="flex-shrink-0">
            <Button
              onClick={onClearFilters}
              variant="outline"
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-soil">Active filters:</span>
          {searchQuery !== '' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-moss/10 border border-moss/30 text-sm text-moss-dark">
              Search: {searchQuery}
              <button
                onClick={() => onSearchChange('')}
                className="hover:text-moss"
                aria-label="Remove search filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {speciesFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-moss/10 border border-moss/30 text-sm text-moss-dark">
              Species: {speciesFilter}
              <button
                onClick={() => onSpeciesChange('all')}
                className="hover:text-moss"
                aria-label="Remove species filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {locationFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-moss/10 border border-moss/30 text-sm text-moss-dark">
              Location: {locationFilter}
              <button
                onClick={() => onLocationChange('all')}
                className="hover:text-moss"
                aria-label="Remove location filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {assigneeFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-moss/10 border border-moss/30 text-sm text-moss-dark">
              Assigned:{' '}
              {assigneeFilter === 'me'
                ? 'Me'
                : assigneeFilter === 'unassigned'
                  ? 'Unassigned'
                  : assigneeOptions.find((u) => u.id === assigneeFilter)?.name || 'Unknown'}
              <button
                onClick={() => onAssigneeChange('all')}
                className="hover:text-moss"
                aria-label="Remove assignee filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
