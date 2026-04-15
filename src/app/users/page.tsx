"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useRef } from "react";
import { IdentityChip } from "@/components/ui/IdentityChip";
import { useUserSearch } from "@/components/users/useUserSearch";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage(): React.JSX.Element {
  const { users, loading, hasMore, query, setQuery, loadMore } =
    useUserSearch();

  // IntersectionObserver sentinel for infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasMore && !loading) {
        loadMore();
      }
    },
    [hasMore, loading, loadMore],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "200px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect]);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Users
      </Typography>

      {/* Search input */}
      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Search by identity…"
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{ htmlInput: { "data-testid": "users-search" } }}
          fullWidth
        />
      </Box>

      {/* Results table */}
      <TableContainer component={Paper} data-testid="users-table">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Resolved Identity</TableCell>
              <TableCell>First Seen</TableCell>
              <TableCell>Last Seen</TableCell>
              <TableCell align="right">Events</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.resolved_id} hover>
                <TableCell>
                  <IdentityChip resolved_id={user.resolved_id} />
                </TableCell>
                <TableCell>{formatDate(user.first_seen)}</TableCell>
                <TableCell>{formatDate(user.last_seen)}</TableCell>
                <TableCell align="right">{user.event_count}</TableCell>
              </TableRow>
            ))}

            {/* Loading skeleton rows */}
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows have no stable id
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton variant="rounded" width={160} height={24} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="text" width={120} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="text" width={120} />
                  </TableCell>
                  <TableCell align="right">
                    <Skeleton variant="text" width={40} />
                  </TableCell>
                </TableRow>
              ))}

            {/* Empty state */}
            {!loading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No users found.{" "}
                    {query
                      ? "Try a different search term."
                      : "Seed sample data or send events from the Test page to get started."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* Explicit load-more button as fallback */}
      {hasMore && !loading && (
        <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
          <Button variant="outlined" onClick={loadMore}>
            Load more
          </Button>
        </Box>
      )}
    </Box>
  );
}
