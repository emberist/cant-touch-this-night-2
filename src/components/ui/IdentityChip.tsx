import Chip from "@mui/material/Chip";
import Link from "next/link";

interface IdentityChipProps {
  resolved_id: string;
}

export function IdentityChip({
  resolved_id,
}: IdentityChipProps): React.JSX.Element {
  return (
    <Link
      href={`/users/${encodeURIComponent(resolved_id)}`}
      style={{ textDecoration: "none" }}
    >
      <Chip label={resolved_id} size="small" clickable />
    </Link>
  );
}
