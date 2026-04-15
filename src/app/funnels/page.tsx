"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { FunnelChart } from "@/components/FunnelChart";
import { FunnelDateRange } from "@/components/funnels/FunnelDateRange";
import { StepBuilder } from "@/components/funnels/StepBuilder";
import { useFunnels } from "@/components/funnels/useFunnels";

export default function FunnelsPage(): React.JSX.Element {
  const {
    schema,
    steps,
    startDate,
    endDate,
    addStep,
    removeStep,
    setStep,
    setStartDate,
    setEndDate,
    runFunnel,
    result,
    loading,
  } = useFunnels();

  const eventNames = schema?.event_names ?? [];
  const funnelSteps = result?.steps ?? [];

  return (
    <Box sx={{ p: 3, maxWidth: 900 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Funnels
      </Typography>

      <StepBuilder
        steps={steps}
        eventNames={eventNames}
        onAddStep={addStep}
        onRemoveStep={removeStep}
        onSetStep={setStep}
      />

      <Box sx={{ mt: 2 }}>
        <FunnelDateRange
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </Box>

      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={runFunnel} disabled={loading}>
          Run Funnel
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      <FunnelChart steps={funnelSteps} loading={loading} />
    </Box>
  );
}
