"use client";

import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { JsonChip } from "@/components/ui/JsonChip";
import type { EventRow } from "@/lib/identity";

// ─── Props ────────────────────────────────────────────────────────────────────

interface UserTimelineProps {
  events: EventRow[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserTimeline({ events }: UserTimelineProps): React.JSX.Element {
  return (
    <TableContainer component={Paper} data-testid="user-timeline">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Timestamp</TableCell>
            <TableCell>Event Name</TableCell>
            <TableCell>Properties</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.event_id}>
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                {new Date(event.timestamp).toLocaleString()}
              </TableCell>
              <TableCell>{event.event_name}</TableCell>
              <TableCell>
                <JsonChip properties={event.properties} />
              </TableCell>
            </TableRow>
          ))}

          {events.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={3}
                sx={{ color: "text.secondary", py: 4, textAlign: "center" }}
              >
                <Typography color="text.secondary">No events found.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
