"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { EventTable } from "@/components/EventTable";
import { EventFilterBar } from "@/components/explore/EventFilterBar";
import { useEventExplorer } from "@/components/explore/useEventExplorer";

export default function ExplorePage(): React.JSX.Element {
  const { events, loading, hasMore, loadMore, setFilter } = useEventExplorer();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Event Explorer
      </Typography>
      <Box sx={{ mb: 2 }}>
        <EventFilterBar onFilterChange={setFilter} />
      </Box>
      <EventTable
        events={events}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        emptyMessage="No events found. Seed sample data or send events from the Test page to get started."
      />
    </Box>
  );
}
