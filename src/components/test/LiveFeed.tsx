"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IdentityChip } from "@/components/ui/IdentityChip";
import { JsonChip } from "@/components/ui/JsonChip";
import type { EventRow } from "@/lib/identity";
import { useLiveFeed } from "./useLiveFeed";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 1000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

// Maps event names to MUI Chip color variants
const EVENT_CHIP_COLORS: Record<
  string,
  "default" | "primary" | "secondary" | "success" | "warning" | "info" | "error"
> = {
  "Page Viewed": "default",
  "Button Clicked": "primary",
  "Signup Completed": "success",
  "Purchase Completed": "warning",
  "Subscription Renewed": "info",
  "Support Ticket Opened": "error",
};

function eventChipColor(
  eventName: string,
):
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "info"
  | "error" {
  return EVENT_CHIP_COLORS[eventName] ?? "secondary";
}

// ─── EventCard ────────────────────────────────────────────────────────────────

interface EventCardProps {
  event: EventRow;
}

function EventCard({ event }: EventCardProps): React.JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }} data-testid="event-card">
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 1,
          mb: 0.5,
        }}
      >
        <Chip
          label={event.event_name}
          size="small"
          color={eventChipColor(event.event_name)}
        />
        <IdentityChip resolved_id={event.resolved_id} />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ ml: "auto" }}
        >
          {formatRelativeTime(event.timestamp)}
        </Typography>
      </Box>
      <JsonChip properties={event.properties} />
    </Paper>
  );
}

// ─── LiveFeed ─────────────────────────────────────────────────────────────────

export function LiveFeed(): React.JSX.Element {
  const { events, paused, connectionStatus, togglePause, clearEvents } =
    useLiveFeed();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 1,
          flexWrap: "wrap",
        }}
      >
        {/* Status dot */}
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            flexShrink: 0,
            bgcolor:
              connectionStatus === "live" ? "success.main" : "error.main",
          }}
          aria-hidden="true"
        />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {connectionStatus === "live" ? "Live" : "Disconnected"}
        </Typography>

        <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
          <Button size="small" variant="outlined" onClick={togglePause}>
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button size="small" variant="outlined" onClick={clearEvents}>
            Clear
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 1 }} />

      {/* Event list */}
      {events.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No events yet
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ overflowY: "auto", flex: 1 }}>
          {events.map((event) => (
            <EventCard key={event.event_id} event={event} />
          ))}
        </Stack>
      )}
    </Box>
  );
}
