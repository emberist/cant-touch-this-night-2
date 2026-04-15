"use client";

import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: "Explore", href: "/explore" },
  { label: "Trends", href: "/trends" },
  { label: "Funnels", href: "/funnels" },
  { label: "Users", href: "/users" },
  { label: "Test", href: "/test" },
  { label: "Generate", href: "/generate" },
] as const;

export default function Sidebar(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
        },
      }}
    >
      <Typography variant="h6" sx={{ p: 2, fontWeight: "bold" }}>
        MiniPanel
      </Typography>
      <List>
        {NAV_ITEMS.map(({ label, href }) => (
          <ListItemButton
            key={href}
            href={href}
            LinkComponent={NextLink}
            selected={pathname === href}
          >
            <ListItemText primary={label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}
