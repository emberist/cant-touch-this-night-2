import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { UserTimeline } from "@/components/UserTimeline";
import type { UserProfile } from "@/lib/users";
import { getUserProfile } from "@/lib/users";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const resolved_id = decodeURIComponent(id);

  let profile: UserProfile | null = null;
  let fetchError: string | null = null;

  try {
    profile = await getUserProfile(resolved_id);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load profile";
  }

  return (
    <Box data-testid="user-profile">
      <Typography variant="h4" component="h1" gutterBottom>
        {profile ? profile.resolved_id : resolved_id}
      </Typography>

      {fetchError && (
        <Typography color="error" sx={{ mb: 2 }}>
          {fetchError}
        </Typography>
      )}

      {!profile && !fetchError && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          User not found.
        </Typography>
      )}

      {profile && (
        <Stack direction="row" spacing={4} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              First seen
            </Typography>
            <Typography variant="body2">
              {formatDate(profile.first_seen)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Last seen
            </Typography>
            <Typography variant="body2">
              {formatDate(profile.last_seen)}
            </Typography>
          </Box>
        </Stack>
      )}

      <Box data-testid="identity-cluster" sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Identity Cluster
        </Typography>

        {profile ? (
          <>
            {profile.identity_cluster.user_ids.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mr: 1 }}
                >
                  User IDs
                </Typography>
                <Stack
                  direction="row"
                  sx={{ flexWrap: "wrap", gap: 0.5 }}
                  component="span"
                >
                  {profile.identity_cluster.user_ids.map((uid) => (
                    <Chip
                      key={uid}
                      label={uid}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {profile.identity_cluster.device_ids.length > 0 && (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mr: 1 }}
                >
                  Device IDs
                </Typography>
                <Stack
                  direction="row"
                  sx={{ flexWrap: "wrap", gap: 0.5 }}
                  component="span"
                >
                  {profile.identity_cluster.device_ids.map((did) => (
                    <Chip
                      key={did}
                      label={did}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </>
        ) : (
          <Typography color="text.secondary" variant="body2">
            No identity data available.
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Typography variant="subtitle1" gutterBottom>
        Event Timeline ({profile ? profile.events.length : 0} events)
      </Typography>

      <UserTimeline events={profile?.events ?? []} />
    </Box>
  );
}
