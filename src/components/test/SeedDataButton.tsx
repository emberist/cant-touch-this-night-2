"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { SeedResult } from "@/components/test/useEventSender";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeedDataButtonProps {
  sendSeed: () => Promise<SeedResult>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SeedDataButton({
  sendSeed,
}: SeedDataButtonProps): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);

  async function handleClick(): Promise<void> {
    setLoading(true);
    setResult(null);
    const r = await sendSeed();
    setLoading(false);
    setResult(r);
  }

  return (
    <Box data-testid="seed-data-button">
      <Button
        variant="contained"
        size="small"
        disabled={loading}
        onClick={() => void handleClick()}
        fullWidth
        startIcon={
          loading ? <CircularProgress size={14} color="inherit" /> : undefined
        }
      >
        Seed Data
      </Button>

      {result != null && (
        <Typography
          variant="caption"
          color={result.success ? "success.main" : "error.main"}
          sx={{ display: "block", mt: 0.5 }}
        >
          {result.success
            ? `Seeded ${result.eventCount?.toLocaleString() ?? 0} events`
            : `Error: ${result.error ?? "Failed"}`}
        </Typography>
      )}
    </Box>
  );
}
