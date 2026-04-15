"use client";

import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { useEffect, useRef } from "react";
import { IdentityChip } from "@/components/ui/IdentityChip";
import { JsonChip } from "@/components/ui/JsonChip";
import type { EventRow } from "@/lib/identity";

interface EventTableProps {
  events: EventRow[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  emptyMessage?: string;
}

export function EventTable({
  events,
  loading,
  hasMore,
  onLoadMore,
  emptyMessage = "No events found.",
}: EventTableProps): React.JSX.Element {
  const sentinelRef = useRef<HTMLTableRowElement>(null);
  // Keep a stable ref to onLoadMore to avoid re-attaching observer on every render
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMoreRef.current();
        }
      },
      { rootMargin: "100px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  return (
    <TableContainer component={Paper} data-testid="event-table">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Timestamp</TableCell>
            <TableCell>Event Name</TableCell>
            <TableCell>Resolved Identity</TableCell>
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
                <IdentityChip resolved_id={event.resolved_id} />
              </TableCell>
              <TableCell>
                <JsonChip properties={event.properties} />
              </TableCell>
            </TableRow>
          ))}
          {events.length === 0 && !loading && (
            <TableRow>
              <TableCell
                colSpan={4}
                sx={{ color: "text.secondary", py: 4, textAlign: "center" }}
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
          {loading && (
            <TableRow>
              <TableCell colSpan={4}>
                <Skeleton variant="rectangular" height={36} />
              </TableCell>
            </TableRow>
          )}
          {hasMore && !loading && (
            <TableRow ref={sentinelRef} aria-hidden="true">
              <TableCell colSpan={4} sx={{ p: 0, border: 0 }} />
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
