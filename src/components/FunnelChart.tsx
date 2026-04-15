"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FunnelStepResult } from "@/lib/funnels";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FunnelChartProps {
  steps: FunnelStepResult[];
  loading: boolean;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const BAR_COLOR = "#1976d2";

// ─── Component ────────────────────────────────────────────────────────────────

export function FunnelChart({
  steps,
  loading,
}: FunnelChartProps): React.JSX.Element {
  return (
    <Box data-testid="funnel-chart">
      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && (
        <Box data-testid="funnel-chart-skeleton">
          <Skeleton variant="rectangular" height={300} />
        </Box>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!loading && steps.length === 0 && (
        <Box
          data-testid="funnel-chart-empty"
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
          <Typography color="text.secondary">
            Select steps and run the funnel to see results.
          </Typography>
        </Box>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {!loading && steps.length > 0 && (
        <Box data-testid="funnel-chart-steps">
          {/* Step annotations (name, users, conversion, drop-off) */}
          <Box sx={{ mb: 3 }}>
            {steps.map((step, i) => (
              <Box key={step.name}>
                {/* Drop-off indicator between steps */}
                {i > 0 && (
                  <Box
                    data-testid="funnel-dropoff"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      ml: 1,
                      my: 0.5,
                    }}
                  >
                    <Typography variant="caption" color="error">
                      ↓{" "}
                      {((1 - (step.conversion_from_prev ?? 1)) * 100).toFixed(
                        1,
                      )}
                      % drop-off
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({((step.conversion_from_prev ?? 0) * 100).toFixed(1)}%
                      converted)
                    </Typography>
                  </Box>
                )}

                {/* Step row */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: "action.hover",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ minWidth: 24, color: "text.secondary" }}
                  >
                    {i + 1}.
                  </Typography>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {step.name}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    {step.users.toLocaleString("en-US")}
                  </Typography>
                  {i > 0 && step.conversion_from_prev !== null && (
                    <Typography variant="caption" color="text.secondary">
                      {(step.conversion_from_prev * 100).toFixed(1)}%
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>

          {/* Recharts horizontal bar chart */}
          <ResponsiveContainer
            width="100%"
            height={Math.max(200, steps.length * 56)}
          >
            <BarChart
              layout="vertical"
              data={steps.map((s) => ({ name: s.name, users: s.users }))}
              margin={{ top: 4, right: 40, left: 120, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => [
                  Number(value).toLocaleString("en-US"),
                  "Users",
                ]}
              />
              <Bar dataKey="users" radius={[0, 4, 4, 0]}>
                {steps.map((step, i) => (
                  <Cell
                    key={step.name}
                    fill={BAR_COLOR}
                    fillOpacity={1 - i * (0.15 / Math.max(steps.length - 1, 1))}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
}
