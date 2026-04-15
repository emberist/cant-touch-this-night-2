"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { JobState, JobStatus } from "@/lib/generator";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobListProps {
  jobs: JobState[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(
  status: JobStatus,
): "default" | "primary" | "success" | "error" | "warning" {
  switch (status) {
    case "queued":
      return "default";
    case "running":
      return "primary";
    case "complete":
      return "success";
    case "failed":
      return "error";
    case "cancelled":
      return "warning";
  }
}

function formatCount(n: number): string {
  return n.toLocaleString();
}

function formatTs(ms: number): string {
  return new Date(ms).toLocaleTimeString();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JobList({ jobs }: JobListProps): React.JSX.Element {
  if (jobs.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No recent jobs.
      </Typography>
    );
  }

  return (
    <Box data-testid="job-list">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Job ID</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Progress</TableCell>
            <TableCell>Started</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.job_id}>
              <TableCell>
                <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                  {job.job_id.slice(0, 8)}…
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={job.status}
                  color={statusColor(job.status)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="caption">
                  {formatCount(job.inserted)} / {formatCount(job.total)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption">
                  {formatTs(job.created_at)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
