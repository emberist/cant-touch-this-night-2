"use client";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { GeneratorForm } from "@/components/generate/GeneratorForm";
import { JobList } from "@/components/generate/JobList";
import { ProgressPanel } from "@/components/generate/ProgressPanel";
import { useGenerator } from "@/components/generate/useGenerator";

export default function GeneratePage(): React.JSX.Element {
  const {
    form,
    setForm,
    applyPreset,
    startJob,
    cancelJob,
    jobActive,
    progress,
    jobs,
  } = useGenerator();

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Generate
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Populate ClickHouse with synthetic events for testing and load
        simulation.
      </Typography>

      <GeneratorForm
        form={form}
        setForm={setForm}
        applyPreset={applyPreset}
        onSubmit={() => void startJob()}
        disabled={jobActive}
      />

      {progress !== null && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <ProgressPanel
            progress={progress}
            onCancel={() => void cancelJob()}
          />
        </Box>
      )}

      {jobs.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Recent jobs
          </Typography>
          <JobList jobs={jobs} />
        </Box>
      )}
    </Box>
  );
}
