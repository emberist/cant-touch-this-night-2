"use client";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useEffect, useState } from "react";

interface SchemaResponse {
  event_names: string[];
}

interface EventFilterBarProps {
  onFilterChange: (eventName: string | null) => void;
}

export function EventFilterBar({
  onFilterChange,
}: EventFilterBarProps): React.JSX.Element {
  const [eventNames, setEventNames] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/schema")
      .then((res) => res.json() as Promise<SchemaResponse>)
      .then((data) => {
        setEventNames(data.event_names ?? []);
      })
      .catch(() => {
        // Leave list empty on error — filter still works as a text input
      });
  }, []);

  return (
    <Autocomplete
      options={eventNames}
      onChange={(_, value) => onFilterChange(value)}
      renderInput={(params) => (
        <TextField {...params} label="Filter by event name" size="small" />
      )}
      sx={{ minWidth: 300 }}
    />
  );
}
