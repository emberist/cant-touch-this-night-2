"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import type { ProgressState } from "@/components/generate/useGenerator";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProgressPanelProps {
  progress: ProgressState;
  onCancel: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  return n.toLocaleString();
}

function statusColor(
  status: ProgressState["status"],
): "default" | "primary" | "success" | "error" | "warning" {
  switch (status) {
    case "queued":
      return "default";
    case "running":
      return "primary";
    case "complete":
      return "success";
    case "failed":
      return "error";
    case "cancelled":
      return "warning";
  }
}

function statusLabel(status: ProgressState["status"]): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "complete":
      return "Complete";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
  }
}

const ACTIVE_STATUSES = new Set<ProgressState["status"]>(["queued", "running"]);

// ─── Component ────────────────────────────────────────────────────────────────

export function ProgressPanel({
  progress,
  onCancel,
}: ProgressPanelProps): React.JSX.Element {
  const pct =
    progress.total > 0
      ? Math.round((progress.inserted / progress.total) * 100)
      : 0;

  const isActive = ACTIVE_STATUSES.has(progress.status);
  const isComplete = progress.status === "complete";

  return (
    <Box data-testid="progress-panel">
      {/* ── Status chip ─────────────────────────────────────────────── */}
      <Stack direction="row" spacing={2} sx={{ mb: 1.5, alignItems: "center" }}>
        <Chip
          label={statusLabel(progress.status)}
          color={statusColor(progress.status)}
          size="small"
        />
        {isActive && (
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </Stack>

      {/* ── Progress bar ────────────────────────────────────────────── */}
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="body2">
            {formatCount(progress.inserted)} / {formatCount(progress.total)}{" "}
            events inserted
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: "bold" }}>
            {pct}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{ height: 8, borderRadius: 1 }}
        />
      </Box>

      {/* ── Throughput & ETA ────────────────────────────────────────── */}
      {progress.throughput > 0 && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block" }}
        >
          ~{formatCount(progress.throughput)} events/sec
        </Typography>
      )}
      {progress.eta_seconds > 0 && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block" }}
        >
          ETA: {progress.eta_seconds}s
        </Typography>
      )}

      {/* ── Completion links ────────────────────────────────────────── */}
      {isComplete && (
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Link component={NextLink} href="/explore" variant="body2">
            Explore data
          </Link>
          <Link component={NextLink} href="/trends" variant="body2">
            View trends
          </Link>
        </Stack>
      )}
    </Box>
  );
}
