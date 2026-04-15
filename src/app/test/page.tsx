"use client";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CustomEventForm } from "@/components/test/CustomEventForm";
import { LiveFeed } from "@/components/test/LiveFeed";
import { QuickFireButtons } from "@/components/test/QuickFireButtons";
import { SeedDataButton } from "@/components/test/SeedDataButton";
import { useEventSender } from "@/components/test/useEventSender";

export default function TestPage(): React.JSX.Element {
  const { sendEvent, sendSeed } = useEventSender();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Test
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
        }}
      >
        {/* Left panel — Event Sender */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Event Sender
          </Typography>

          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Quick-fire
              </Typography>
              <QuickFireButtons />
            </Box>

            <Divider />

            <CustomEventForm sendEvent={sendEvent} />

            <Divider />

            <SeedDataButton sendSeed={sendSeed} />
          </Stack>
        </Paper>

        {/* Right panel — Live Feed */}
        <Paper variant="outlined" sx={{ p: 2, minHeight: 400 }}>
          <Typography variant="h6" gutterBottom>
            Live Feed
          </Typography>
          <LiveFeed />
        </Paper>
      </Box>
    </Box>
  );
}
