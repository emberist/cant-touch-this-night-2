"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { EventPayload } from "@/components/test/useEventSender";
import { generateId, useEventSender } from "@/components/test/useEventSender";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ButtonFeedback {
  type: "success" | "error";
  message: string;
}

// ─── Quick-fire button config ─────────────────────────────────────────────────

const TEST_USER_ID = "test@example.com";

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickFireButtons(): React.JSX.Element {
  const { sendEvent, lastDeviceId } = useEventSender();
  const [feedback, setFeedback] = useState<
    Record<string, ButtonFeedback | null>
  >({});
  const [loadingButton, setLoadingButton] = useState<string | null>(null);

  async function fire(
    id: string,
    getPayload: () => EventPayload,
  ): Promise<void> {
    setLoadingButton(id);
    setFeedback((prev) => ({ ...prev, [id]: null }));
    const result = await sendEvent(getPayload());
    setLoadingButton(null);
    setFeedback((prev) => ({
      ...prev,
      [id]: result.success
        ? { type: "success", message: "Sent" }
        : { type: "error", message: result.error ?? "Error" },
    }));
  }

  const buttons: Array<{
    id: string;
    label: string;
    getPayload: () => EventPayload;
  }> = [
    {
      id: "anon-page-view",
      label: "Anonymous Page View",
      getPayload: () => ({
        event_name: "Page Viewed",
        device_id: generateId(),
        properties: { page: "/home" },
      }),
    },
    {
      id: "button-click",
      label: "Button Click",
      getPayload: () => ({
        event_name: "Button Clicked",
        device_id: lastDeviceId ?? generateId(),
        properties: { button_name: "Get Started" },
      }),
    },
    {
      id: "identify-user",
      label: "Identify User",
      getPayload: () => ({
        event_name: "Identify",
        device_id: lastDeviceId ?? generateId(),
        user_id: TEST_USER_ID,
      }),
    },
    {
      id: "purchase",
      label: "Purchase",
      getPayload: () => ({
        event_name: "Purchase Completed",
        user_id: TEST_USER_ID,
        properties: { amount: 49.99, currency: "USD" },
      }),
    },
    {
      id: "signup",
      label: "Signup",
      getPayload: () => ({
        event_name: "Signup Completed",
        device_id: generateId(),
        user_id: `user-${generateId()}@example.com`,
      }),
    },
  ];

  return (
    <Box data-testid="quick-fire-buttons">
      <Stack spacing={1}>
        {buttons.map(({ id, label, getPayload }) => (
          <Box key={id}>
            <Button
              variant="outlined"
              size="small"
              disabled={loadingButton === id}
              onClick={() => void fire(id, getPayload)}
              fullWidth
            >
              {label}
            </Button>
            {feedback[id] != null && (
              <Typography
                variant="caption"
                color={
                  feedback[id]?.type === "success"
                    ? "success.main"
                    : "error.main"
                }
                sx={{ display: "block", mt: 0.25 }}
              >
                {feedback[id]?.type === "success"
                  ? "Sent"
                  : `Error: ${feedback[id]?.message}`}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
