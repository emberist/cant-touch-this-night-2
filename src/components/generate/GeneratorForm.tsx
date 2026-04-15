"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type {
  GeneratorFormState,
  Preset,
} from "@/components/generate/useGenerator";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratorFormProps {
  form: GeneratorFormState;
  setForm: (updates: Partial<GeneratorFormState>) => void;
  applyPreset: (preset: Preset) => void;
  onSubmit: () => void;
  disabled: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VARIANCE_MARKS = [
  { value: 0, label: "Low" },
  { value: 50, label: "Medium" },
  { value: 100, label: "High" },
];

function varianceToSlider(v: string): number {
  if (v === "low") return 0;
  if (v === "high") return 100;
  return 50;
}

function sliderToVariance(v: number): GeneratorFormState["numeric_variance"] {
  if (v <= 25) return "low";
  if (v >= 75) return "high";
  return "medium";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GeneratorForm({
  form,
  setForm,
  applyPreset,
  onSubmit,
  disabled,
}: GeneratorFormProps): React.JSX.Element {
  return (
    <Box data-testid="generator-form">
      {/* ── Preset templates ────────────────────────────────────────── */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" gutterBottom>
          Preset templates
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
          <Chip
            label="Realistic"
            size="small"
            clickable
            onClick={() => applyPreset("realistic")}
          />
          <Chip
            label="High volume"
            size="small"
            clickable
            onClick={() => applyPreset("high-volume")}
          />
          <Chip
            label="Stress test"
            size="small"
            clickable
            onClick={() => applyPreset("stress-test")}
          />
        </Stack>
      </Box>

      {/* ── Volume ──────────────────────────────────────────────────── */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Total events"
          type="number"
          size="small"
          value={form.total}
          onChange={(e) => {
            const v = Number.parseInt(e.target.value, 10);
            if (!Number.isNaN(v)) setForm({ total: v });
          }}
          slotProps={{
            htmlInput: { min: 1, max: 1_000_000 },
            inputLabel: { shrink: true },
          }}
          sx={{ width: 160 }}
        />
        <TextField
          label="Users"
          type="number"
          size="small"
          value={form.users}
          onChange={(e) => {
            const v = Number.parseInt(e.target.value, 10);
            if (!Number.isNaN(v)) setForm({ users: v });
          }}
          slotProps={{
            htmlInput: { min: 1 },
            inputLabel: { shrink: true },
          }}
          sx={{ width: 120 }}
        />
      </Stack>

      {/* ── Date range ──────────────────────────────────────────────── */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Start"
          type="date"
          size="small"
          value={form.start}
          onChange={(e) => setForm({ start: e.target.value })}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 160 }}
        />
        <TextField
          label="End"
          type="date"
          size="small"
          value={form.end}
          onChange={(e) => setForm({ end: e.target.value })}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 160 }}
        />
      </Stack>

      {/* ── Event mix ───────────────────────────────────────────────── */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" gutterBottom>
          Event mix
        </Typography>
        <FormGroup>
          {form.event_types.map((et, idx) => (
            <Box
              key={et.name}
              sx={{ display: "flex", alignItems: "center", gap: 2, mb: 0.5 }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={et.weight > 0}
                    onChange={(e) => {
                      const updated = form.event_types.map((t, i) =>
                        i === idx
                          ? { ...t, weight: e.target.checked ? 0.1 : 0 }
                          : t,
                      );
                      setForm({ event_types: updated });
                    }}
                    size="small"
                  />
                }
                label={et.name}
                sx={{ minWidth: 200, m: 0 }}
              />
              <Slider
                size="small"
                value={et.weight}
                min={0}
                max={1}
                step={0.01}
                disabled={et.weight === 0}
                onChange={(_, v) => {
                  const updated = form.event_types.map((t, i) =>
                    i === idx ? { ...t, weight: v as number } : t,
                  );
                  setForm({ event_types: updated });
                }}
                aria-label={`${et.name} weight`}
                sx={{ width: 120 }}
              />
              <Typography variant="caption" sx={{ minWidth: 36 }}>
                {(et.weight * 100).toFixed(0)}%
              </Typography>
            </Box>
          ))}
        </FormGroup>
      </Box>

      {/* ── Identity resolution ─────────────────────────────────────── */}
      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={form.identity_resolution}
              onChange={(e) =>
                setForm({ identity_resolution: e.target.checked })
              }
              slotProps={{ input: { "aria-label": "Identity resolution" } }}
            />
          }
          label="Identity resolution"
        />
        <Box sx={{ mt: 1, px: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Anonymous ratio: {form.anonymous_ratio}%
          </Typography>
          <Slider
            size="small"
            value={form.anonymous_ratio}
            min={0}
            max={100}
            disabled={!form.identity_resolution}
            onChange={(_, v) => setForm({ anonymous_ratio: v as number })}
            aria-label="Anonymous ratio"
            sx={{ mt: 0.5 }}
          />
        </Box>
      </Box>

      {/* ── Numeric variance ────────────────────────────────────────── */}
      <Box sx={{ mb: 3, px: 1 }}>
        <Typography variant="caption" color="text.secondary" gutterBottom>
          Numeric property variance
        </Typography>
        <Slider
          size="small"
          value={varianceToSlider(form.numeric_variance)}
          min={0}
          max={100}
          step={50}
          marks={VARIANCE_MARKS}
          onChange={(_, v) =>
            setForm({ numeric_variance: sliderToVariance(v as number) })
          }
          aria-label="Numeric variance"
        />
      </Box>

      {/* ── Submit ──────────────────────────────────────────────────── */}
      <Button variant="contained" onClick={onSubmit} disabled={disabled}>
        Generate
      </Button>
    </Box>
  );
}
