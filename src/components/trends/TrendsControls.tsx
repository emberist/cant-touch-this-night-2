"use client";

import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import type { SelectChangeEvent } from "@mui/material/Select";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import type {
  UseTrendsControls,
  UseTrendsSetters,
} from "@/components/trends/useTrends";
import type { SchemaResponse } from "@/lib/schema-cache";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrendsControlsProps {
  schema: SchemaResponse | null;
  controls: UseTrendsControls;
  setters: UseTrendsSetters;
  numericProperties: string[];
}

// ─── Measure helpers ──────────────────────────────────────────────────────────

/** Extract the aggregate function key from the combined measure string. */
function parseMeasureFn(measure: string): string {
  if (measure === "count" || measure === "unique_users") return measure;
  const colon = measure.indexOf(":");
  return colon !== -1 ? measure.slice(0, colon) : measure;
}

/** Extract the property name from the combined measure string. */
function parseMeasureProp(measure: string): string {
  const colon = measure.indexOf(":");
  return colon !== -1 ? measure.slice(colon + 1) : "";
}

const AGGREGATION_FNS = new Set(["sum", "avg", "min", "max"]);

function isAggregation(measureFn: string): boolean {
  return AGGREGATION_FNS.has(measureFn);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrendsControls({
  schema,
  controls,
  setters,
  numericProperties,
}: TrendsControlsProps): React.JSX.Element {
  const eventNames = schema?.event_names ?? [];
  const measureFn = parseMeasureFn(controls.measure);
  const measureProp = parseMeasureProp(controls.measure);
  const showPropertySelector = isAggregation(measureFn);

  function handleMeasureFnChange(e: SelectChangeEvent) {
    const fn = e.target.value;
    if (fn === "count" || fn === "unique_users") {
      setters.setMeasure(fn);
    } else {
      // Keep current property or default to first numeric property
      const prop = measureProp || numericProperties[0] || "";
      setters.setMeasure(`${fn}:${prop}`);
    }
  }

  function handlePropertyChange(_: React.SyntheticEvent, value: string | null) {
    if (value) {
      setters.setMeasure(`${measureFn}:${value}`);
    }
  }

  function handlePreset(days: number) {
    setters.setStartDate(daysAgoISO(days));
    setters.setEndDate(todayISO());
  }

  return (
    <Box data-testid="trends-controls">
      <Stack spacing={2}>
        {/* ── Event name ──────────────────────────────────────────────────── */}
        <Autocomplete
          options={eventNames}
          value={controls.eventName}
          onChange={(_, value) => setters.setEventName(value)}
          renderInput={(params) => (
            <TextField {...params} label="Event name" size="small" />
          )}
          sx={{ minWidth: 260 }}
        />

        {/* ── Measure ─────────────────────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 1,
            alignItems: "center",
          }}
        >
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="measure-fn-label">Measure</InputLabel>
            <Select
              native
              labelId="measure-fn-label"
              label="Measure"
              value={measureFn}
              onChange={handleMeasureFnChange}
            >
              <option value="count">Count</option>
              <option value="unique_users">Unique Users</option>
              <option value="sum">Sum of</option>
              <option value="avg">Avg of</option>
              <option value="min">Min of</option>
              <option value="max">Max of</option>
            </Select>
          </FormControl>

          {showPropertySelector && (
            <Autocomplete
              options={numericProperties}
              value={measureProp || null}
              onChange={handlePropertyChange}
              renderInput={(params) => (
                <TextField {...params} label="Property" size="small" />
              )}
              sx={{ minWidth: 200 }}
            />
          )}
        </Box>

        {/* ── Granularity ─────────────────────────────────────────────────── */}
        <Box>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Granularity
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={controls.granularity}
            onChange={(_, v: "day" | "week" | null) => {
              if (v) setters.setGranularity(v);
            }}
            size="small"
          >
            <ToggleButton value="day">Day</ToggleButton>
            <ToggleButton value="week">Week</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* ── Date range ──────────────────────────────────────────────────── */}
        <Box>
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
              value={controls.startDate}
              onChange={(e) => setters.setStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="End"
              type="date"
              size="small"
              value={controls.endDate}
              onChange={(e) => setters.setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        </Box>

        {/* ── Breakdown ───────────────────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 1,
            alignItems: "center",
          }}
        >
          <Autocomplete
            options={
              controls.eventName
                ? Object.keys(schema?.properties[controls.eventName] ?? {})
                : []
            }
            value={controls.breakdown}
            onChange={(_, value) => setters.setBreakdown(value)}
            renderInput={(params) => (
              <TextField {...params} label="Breakdown by" size="small" />
            )}
            sx={{ minWidth: 200 }}
          />
          {controls.breakdown && (
            <TextField
              label="Limit"
              type="number"
              size="small"
              value={controls.breakdownLimit}
              onChange={(e) =>
                setters.setBreakdownLimit(Number(e.target.value))
              }
              sx={{ width: 80 }}
              slotProps={{ htmlInput: { min: 1, max: 50 } }}
            />
          )}
        </Box>
      </Stack>
    </Box>
  );
}
