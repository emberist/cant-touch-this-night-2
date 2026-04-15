"use client";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { TrendChart } from "@/components/TrendChart";
import { TrendsControls } from "@/components/trends/TrendsControls";
import { useTrends } from "@/components/trends/useTrends";

export default function TrendsPage(): React.JSX.Element {
  const { schema, controls, setters, series, numericProperties, loading } =
    useTrends();

  return (
    <Box sx={{ p: 3, maxWidth: 1100 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Trends
      </Typography>

      <TrendsControls
        schema={schema}
        controls={controls}
        setters={setters}
        numericProperties={numericProperties}
      />

      <Divider sx={{ my: 3 }} />

      <TrendChart series={series} loading={loading} />
    </Box>
  );
}
