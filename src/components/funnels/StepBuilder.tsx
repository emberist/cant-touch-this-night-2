"use client";

import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepBuilderProps {
  steps: string[];
  eventNames: string[];
  onAddStep: () => void;
  onRemoveStep: (index: number) => void;
  onSetStep: (index: number, value: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StepBuilder({
  steps,
  eventNames,
  onAddStep,
  onRemoveStep,
  onSetStep,
}: StepBuilderProps): React.JSX.Element {
  const canRemove = steps.length > 2;
  const canAdd = steps.length < 5;

  return (
    <Box data-testid="step-builder">
      <Stack spacing={1.5}>
        {steps.map((step, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: steps are ordered user inputs that may be empty or identical
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ minWidth: 24, textAlign: "right" }}
            >
              {i + 1}.
            </Typography>
            <Autocomplete
              options={eventNames}
              value={step || null}
              onChange={(_, value) => onSetStep(i, value ?? "")}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={`Step ${i + 1}`}
                  size="small"
                  placeholder="Select event…"
                />
              )}
              sx={{ flex: 1, minWidth: 220 }}
            />
            <IconButton
              size="small"
              aria-label="Remove step"
              disabled={!canRemove}
              onClick={() => onRemoveStep(i)}
            >
              ✕
            </IconButton>
          </Box>
        ))}
      </Stack>

      <Box sx={{ mt: 1.5 }}>
        <Button
          size="small"
          variant="outlined"
          disabled={!canAdd}
          onClick={onAddStep}
        >
          Add Step
        </Button>
      </Box>
    </Box>
  );
}
