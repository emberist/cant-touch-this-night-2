"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type {
  EventPayload,
  SendResult,
} from "@/components/test/useEventSender";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomEventFormProps {
  sendEvent: (payload: EventPayload) => Promise<SendResult>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomEventForm({
  sendEvent,
}: CustomEventFormProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  // Form field state
  const [eventName, setEventName] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [userId, setUserId] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [propertiesRaw, setPropertiesRaw] = useState("");
  const [propertiesError, setPropertiesError] = useState(false);

  // Submit feedback
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function handlePropertiesChange(raw: string): void {
    setPropertiesRaw(raw);
    if (raw.trim() === "") {
      setPropertiesError(false);
      return;
    }
    try {
      JSON.parse(raw);
      setPropertiesError(false);
    } catch {
      setPropertiesError(true);
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!eventName.trim() || propertiesError) return;

    const payload: EventPayload = { event_name: eventName.trim() };
    if (deviceId.trim()) payload.device_id = deviceId.trim();
    if (userId.trim()) payload.user_id = userId.trim();
    if (timestamp.trim()) payload.timestamp = timestamp.trim();
    if (propertiesRaw.trim()) {
      try {
        payload.properties = JSON.parse(propertiesRaw) as Record<
          string,
          unknown
        >;
      } catch {
        setPropertiesError(true);
        return;
      }
    }

    setLoading(true);
    setFeedback(null);
    const result = await sendEvent(payload);
    setLoading(false);
    setFeedback(
      result.success
        ? { type: "success", message: "Sent" }
        : { type: "error", message: result.error ?? "Error" },
    );
  }

  return (
    <Box data-testid="custom-event-form">
      <Button
        variant="outlined"
        size="small"
        onClick={() => setOpen((v) => !v)}
        fullWidth
      >
        Custom Event
      </Button>

      {open && (
        <Box
          component="form"
          onSubmit={(e) => void handleSubmit(e)}
          sx={{ mt: 1 }}
        >
          <Stack spacing={1}>
            <TextField
              label="Event Name"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              size="small"
              required
              fullWidth
            />
            <TextField
              label="Device ID"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Timestamp"
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Properties"
              value={propertiesRaw}
              onChange={(e) => handlePropertiesChange(e.target.value)}
              size="small"
              multiline
              rows={3}
              fullWidth
              error={propertiesError}
              helperText={propertiesError ? "Invalid JSON" : undefined}
              placeholder='{"key": "value"}'
              slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
            />

            <Button
              type="submit"
              variant="contained"
              size="small"
              disabled={!eventName.trim() || propertiesError || loading}
              fullWidth
            >
              Send
            </Button>

            {feedback != null && (
              <Typography
                variant="caption"
                color={
                  feedback.type === "success" ? "success.main" : "error.main"
                }
              >
                {feedback.type === "success"
                  ? "Sent"
                  : `Error: ${feedback.message}`}
              </Typography>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
