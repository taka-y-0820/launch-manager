import { useState, useCallback } from "react";
import type { ProcessInfo, AppDefinition } from "../types";

interface ProcessCardProps {
  process: ProcessInfo;
  appDefinition?: AppDefinition;
  onStart: (appId: string) => void;
  onStop: (appId: string) => void;
  onRestart: (appId: string) => void;
  selected?: boolean;
  focused?: boolean;
  onSelect?: (appId: string) => void;
}

export function ProcessCard({
  process,
  appDefinition,
  onStart,
  onStop,
  onRestart,
  selected,
  focused,
  onSelect,
}: ProcessCardProps) {
  const [hovered, setHovered] = useState(false);

  const formatUptime = (startedAt?: string) => {
    if (!startedAt) return "";
    const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return diff < 86400 ? `${h}h${m}m` : `${Math.floor(diff / 86400)}d`;
  };

  const formatMem = (bytes: number) => {
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}K`;
    return `${(bytes / 1048576).toFixed(0)}M`;
  };

  const isRunning = process.status === "Running";
  const isStopped = process.status === "Stopped";
  const isTransitioning = process.status === "Starting" || process.status === "Stopping";
  const isFailed = process.status === "Failed";

  // Single click to select, double click to toggle
  const handleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onSelect?.(process.app_id);
  }, [onSelect, process.app_id]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isTransitioning) return;
    isRunning ? onStop(process.app_id) : onStart(process.app_id);
  }, [isRunning, isTransitioning, onStart, onStop, process.app_id]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTransitioning) return;
    isRunning ? onStop(process.app_id) : onStart(process.app_id);
  }, [isRunning, isTransitioning, onStart, onStop, process.app_id]);

  return (
    <div
      className={`pc ${process.status.toLowerCase()} ${selected ? "selected" : ""} ${focused ? "focused" : ""}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
    >
      {/* Status indicator line */}
      <div className="pc-indicator" />

      {/* Main content */}
      <div className="pc-content">
        <div className="pc-left">
          <span className="pc-name">{process.name}</span>
          {process.restart_count > 0 && (
            <span className="pc-badge">{process.restart_count}×</span>
          )}
        </div>

        <div className="pc-right">
          {/* Metrics when running */}
          {isRunning && (
            <div className="pc-metrics">
              <span className="pc-uptime">{formatUptime(process.started_at)}</span>
              <span className="pc-stat">{process.cpu_usage.toFixed(0)}%</span>
              <span className="pc-stat">{formatMem(process.memory_usage)}</span>
            </div>
          )}

          {/* Transitioning state */}
          {isTransitioning && (
            <div className="pc-loading">
              <div className="pc-spinner" />
            </div>
          )}

          {/* Failed indicator */}
          {isFailed && (
            <span className="pc-error-icon" title={process.error_message}>!</span>
          )}

          {/* Action button - always visible but styled differently */}
          <button
            className={`pc-action ${isRunning ? "stop" : "start"}`}
            onClick={handleToggle}
            disabled={isTransitioning}
            aria-label={isRunning ? "Stop" : "Start"}
          >
            {isRunning ? <StopIcon /> : <PlayIcon />}
          </button>

          {/* Restart button - only on hover when running */}
          {isRunning && hovered && (
            <button
              className="pc-action restart"
              onClick={(e) => {
                e.stopPropagation();
                onRestart(process.app_id);
              }}
              aria-label="Restart"
            >
              <RestartIcon />
            </button>
          )}
        </div>
      </div>

      {/* Command preview on hover or when focused */}
      {(hovered || focused) && appDefinition && (
        <div className="pc-preview">
          <code>{appDefinition.command}</code>
        </div>
      )}
    </div>
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
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function RestartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" />
    </svg>
  );
}
