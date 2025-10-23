'use client';

interface FilterDropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function FilterDropdown({ options, value, onChange, label = "Filter by Species Type" }: FilterDropdownProps) {
  return (
    <div className="inline-flex flex-col">
      {label && (
        <label className="text-sm font-medium text-soil mb-2">{label}</label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border-2 border-sage bg-white px-4 py-2 text-moss-dark focus:border-moss focus:outline-none cursor-pointer hover:border-moss-light transition-colors"
      >
        <option value="all">All Plants</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
