"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Series } from "@/lib/trends";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChartType = "line" | "bar" | "area" | "table";

interface TrendChartProps {
  series: Series[];
  loading: boolean;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const COLORS = [
  "#1976d2",
  "#e91e63",
  "#4caf50",
  "#ff9800",
  "#9c27b0",
  "#00bcd4",
  "#f44336",
  "#607d8b",
];

// ─── Table view ───────────────────────────────────────────────────────────────

function TableView({ series }: { series: Series[] }): React.JSX.Element {
  if (series.length === 0) return <></>;

  // Collect all unique dates across all series
  const allDates = Array.from(
    new Set(series.flatMap((s) => s.data.map((p) => p.date))),
  ).sort();

  // Build a lookup: label → date → value
  const lookup = new Map<string, Map<string, number>>();
  for (const s of series) {
    const byDate = new Map<string, number>();
    for (const p of s.data) {
      byDate.set(p.date, p.value);
    }
    lookup.set(s.label, byDate);
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Date</TableCell>
          {series.map((s) => (
            <TableCell key={s.label} align="right">
              {s.label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {allDates.map((date) => (
          <TableRow key={date}>
            <TableCell>{date}</TableCell>
            {series.map((s) => (
              <TableCell key={s.label} align="right">
                {lookup.get(s.label)?.get(date) ?? "-"}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── Recharts data shape ──────────────────────────────────────────────────────

/** Transform series into a flat array usable by Recharts (one row per date). */
function toRechartsData(series: Series[]): Record<string, string | number>[] {
  const allDates = Array.from(
    new Set(series.flatMap((s) => s.data.map((p) => p.date))),
  ).sort();

  return allDates.map((date) => {
    const row: Record<string, string | number> = { date };
    for (const s of series) {
      const point = s.data.find((p) => p.date === date);
      row[s.label] = point?.value ?? 0;
    }
    return row;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrendChart({
  series,
  loading,
}: TrendChartProps): React.JSX.Element {
  // Determine initial chart type: if only 1 data bucket across all series → bar
  const isSingleBucket =
    series.length > 0 && series.every((s) => s.data.length === 1);

  const [chartType, setChartType] = useState<ChartType>(
    isSingleBucket ? "bar" : "line",
  );

  // Re-evaluate auto-switch when series changes
  useEffect(() => {
    if (series.length === 0) return;
    const single = series.every((s) => s.data.length === 1);
    setChartType(single ? "bar" : "line");
  }, [series]);

  const data = toRechartsData(series);
  const hasData = series.length > 0;

  return (
    <Box data-testid="trend-chart">
      {/* ── Chart type toggle ──────────────────────────────────────────────── */}
      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={chartType}
          onChange={(_, v: ChartType | null) => {
            if (v) setChartType(v);
          }}
        >
          <ToggleButton value="line">Line</ToggleButton>
          <ToggleButton value="bar">Bar</ToggleButton>
          <ToggleButton value="area">Area</ToggleButton>
          <ToggleButton value="table">Table</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ── Content area ──────────────────────────────────────────────────── */}
      {loading && (
        <Box data-testid="trend-chart-skeleton">
          <Skeleton variant="rectangular" height={300} />
        </Box>
      )}

      {!loading && !hasData && (
        <Box
          data-testid="trend-chart-empty"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 300,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          <Typography color="text.secondary">No data</Typography>
        </Box>
      )}

      {!loading && hasData && chartType === "table" && (
        <TableView series={series} />
      )}

      {!loading && hasData && chartType === "line" && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {series.map((s, i) => (
              <Line
                key={s.label}
                type="monotone"
                dataKey={s.label}
                stroke={COLORS[i % COLORS.length]}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {!loading && hasData && chartType === "bar" && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {series.map((s, i) => (
              <Bar
                key={s.label}
                dataKey={s.label}
                fill={COLORS[i % COLORS.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}

      {!loading && hasData && chartType === "area" && (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {series.map((s, i) => (
              <Area
                key={s.label}
                type="monotone"
                dataKey={s.label}
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}
