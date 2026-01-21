import type { RefObject } from "react";
import type { ProcessStatus } from "../types";

interface SearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: ProcessStatus | "all";
  onStatusFilterChange: (status: ProcessStatus | "all") => void;
  totalCount: number;
  filteredCount: number;
  inputRef?: RefObject<HTMLInputElement | null>;
}

export function SearchFilter({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalCount,
  filteredCount,
  inputRef,
}: SearchFilterProps) {
  const statuses: { value: ProcessStatus | "all"; label: string; color?: string }[] = [
    { value: "all", label: "All" },
    { value: "Running", label: "Run", color: "var(--status-running)" },
    { value: "Stopped", label: "Stop", color: "var(--status-stopped)" },
    { value: "Failed", label: "Fail", color: "var(--status-failed)" },
  ];

  const showCount = searchQuery || statusFilter !== "all";

  return (
    <div className="search-filter-compact">
      <div className="sfc-search">
        <SearchIcon />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button className="sfc-clear" onClick={() => onSearchChange("")}>
            <CloseIcon />
          </button>
        )}
      </div>

      <div className="sfc-filters">
        {statuses.map((s) => (
          <button
            key={s.value}
            className={`sfc-filter-btn ${statusFilter === s.value ? "active" : ""}`}
            onClick={() => onStatusFilterChange(s.value)}
          >
            {s.color && (
              <span
                className="sfc-dot"
                style={{ background: s.color }}
              />
            )}
            {s.label}
          </button>
        ))}
      </div>

      {showCount && (
        <span className="sfc-count">{filteredCount}/{totalCount}</span>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
