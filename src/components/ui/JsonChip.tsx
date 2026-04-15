"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import { useState } from "react";

interface JsonChipProps {
  properties: string;
}

export function JsonChip({ properties }: JsonChipProps): React.JSX.Element {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  let parsed: Record<string, unknown> = {};
  try {
    if (properties && properties.trim() !== "") {
      parsed = JSON.parse(properties) as Record<string, unknown>;
    }
  } catch {
    parsed = {};
  }

  const keys = Object.keys(parsed);

  if (keys.length === 0) {
    return <Chip label="No properties" size="small" variant="outlined" />;
  }

  const preview = keys.slice(0, 2).join(", ") + (keys.length > 2 ? ", …" : "");

  return (
    <>
      <Chip
        label={preview}
        size="small"
        variant="outlined"
        onClick={(e: React.MouseEvent<HTMLDivElement>) =>
          setAnchorEl(e.currentTarget)
        }
        sx={{ cursor: "pointer" }}
        aria-label="Show properties"
      />
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 2 }}>
          <Typography
            component="pre"
            variant="body2"
            sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap", m: 0 }}
          >
            {JSON.stringify(parsed, null, 2)}
          </Typography>
        </Box>
      </Popover>
    </>
  );
}
