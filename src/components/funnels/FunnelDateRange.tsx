"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FunnelDateRangeProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FunnelDateRange({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: FunnelDateRangeProps): React.JSX.Element {
  function handlePreset(days: number) {
    onStartDateChange(daysAgoISO(days));
    onEndDateChange(todayISO());
  }

  return (
    <Box data-testid="funnel-date-range">
      <Typography variant="caption" color="text.secondary" gutterBottom>
        Date range
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        <Chip
          label="Last 7d"
          size="small"
          clickable
          onClick={() => handlePreset(7)}
        />
        <Chip
          label="Last 30d"
          size="small"
          clickable
          onClick={() => handlePreset(30)}
        />
        <Chip
          label="Last 90d"
          size="small"
          clickable
          onClick={() => handlePreset(90)}
        />
      </Stack>
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          label="Start"
          type="date"
          size="small"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="End"
          type="date"
          size="small"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Box>
    </Box>
  );
}
