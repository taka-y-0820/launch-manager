import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { ProcessInfo, ProcessStatus, AppDefinition } from "../types";
import { ProcessCard } from "./ProcessCard";

interface ProcessListProps {
  processes: ProcessInfo[];
  apps?: AppDefinition[];
  onStart: (appId: string) => void;
  onStop: (appId: string) => void;
  onRestart: (appId: string) => void;
  onStopAll: () => void;
  onStartAll?: () => void;
}

export function ProcessList({
  processes,
  apps = [],
  onStart,
  onStop,
  onRestart,
  onStopAll,
  onStartAll,
}: ProcessListProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ProcessStatus | "all">("all");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter and sort
  const items = useMemo(() => {
    const filtered = processes.filter((p) => {
      const matchQuery = !query ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.app_id.toLowerCase().includes(query.toLowerCase());
      const matchFilter = filter === "all" || p.status === filter;
      return matchQuery && matchFilter;
    });

    return filtered.sort((a, b) => {
      const order: Record<ProcessStatus, number> = {
        Running: 0, Starting: 1, Restarting: 2, Stopping: 3, Failed: 4, Stopped: 5
      };
      return order[a.status] - order[b.status] || a.name.localeCompare(b.name);
    });
  }, [processes, query, filter]);

  const getApp = useCallback((id: string) => apps.find((a) => a.id === id), [apps]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Global shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      // List navigation when not in input
      if (document.activeElement === inputRef.current) {
        if (e.key === "Escape") {
          inputRef.current?.blur();
          setFocusedIndex(0);
        }
        if (e.key === "ArrowDown" && items.length > 0) {
          e.preventDefault();
          inputRef.current?.blur();
          setFocusedIndex(0);
        }
        return;
      }

      // List navigation
      switch (e.key) {
        case "ArrowDown":
        case "j":
          e.preventDefault();
          setFocusedIndex((i) => Math.min(i + 1, items.length - 1));
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < items.length) {
            const item = items[focusedIndex];
            if (item.status === "Running") {
              onStop(item.app_id);
            } else if (item.status === "Stopped" || item.status === "Failed") {
              onStart(item.app_id);
            }
          }
          break;
        case "r":
          if (focusedIndex >= 0 && focusedIndex < items.length) {
            const item = items[focusedIndex];
            if (item.status === "Running") {
              onRestart(item.app_id);
            }
          }
          break;
        case "/":
          e.preventDefault();
          inputRef.current?.focus();
          break;
        case "Escape":
          setFocusedIndex(-1);
          setSelectedId(null);
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [items, focusedIndex, onStart, onStop, onRestart]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const el = listRef.current.children[focusedIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusedIndex]);

  const running = processes.filter((p) => p.status === "Running").length;
  const stopped = processes.filter((p) => p.status === "Stopped").length;
  const failed = processes.filter((p) => p.status === "Failed").length;

  const filters: { key: ProcessStatus | "all"; label: string; count: number }[] = [
    { key: "all", label: "All", count: processes.length },
    { key: "Running", label: "Run", count: running },
    { key: "Stopped", label: "Stop", count: stopped },
    { key: "Failed", label: "Fail", count: failed },
  ];

  if (processes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="M9 9h6v6H9z" />
          </svg>
        </div>
        <p>No processes configured</p>
        <span>Add apps in Configuration</span>
      </div>
    );
  }

  return (
    <div className="pl">
      {/* Minimal toolbar */}
      <div className="pl-toolbar">
        <div className="pl-search">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="pl-clear" onClick={() => setQuery("")}>
              <CloseIcon />
            </button>
          )}
          <kbd>/</kbd>
        </div>

        <div className="pl-filters">
          {filters.map((f) => (
            <button
              key={f.key}
              className={`pl-filter ${filter === f.key ? "active" : ""} ${f.key}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              {f.count > 0 && <span>{f.count}</span>}
            </button>
          ))}
        </div>

        <div className="pl-actions">
          {stopped > 0 && onStartAll && (
            <button className="pl-btn start" onClick={onStartAll}>
              <PlayIcon /> All
            </button>
          )}
          {running > 0 && (
            <button className="pl-btn stop" onClick={onStopAll}>
              <StopIcon /> All
            </button>
          )}
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="pl-hints">
        <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
        <span><kbd>Space</kbd> Toggle</span>
        <span><kbd>R</kbd> Restart</span>
        <span>Double-click to toggle</span>
      </div>

      {/* Process list */}
      {items.length === 0 ? (
        <div className="pl-empty">
          <p>No matches</p>
          <button onClick={() => { setQuery(""); setFilter("all"); }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="pl-list" ref={listRef}>
          {items.map((proc, i) => (
            <ProcessCard
              key={proc.app_id}
              process={proc}
              appDefinition={getApp(proc.app_id)}
              onStart={onStart}
              onStop={onStop}
              onRestart={onRestart}
              selected={selectedId === proc.app_id}
              focused={focusedIndex === i}
              onSelect={(id) => {
                setSelectedId(id === selectedId ? null : id);
                setFocusedIndex(i);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Icons
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}
