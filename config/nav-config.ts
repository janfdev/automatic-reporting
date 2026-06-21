import { NavGroup } from "@/types";

/**
 * Navigation configuration for Admin Dashboard
 *
 * This configuration is used for both the sidebar navigation and Cmd+K bar.
 * Items are organized into groups, each rendered with a SidebarGroupLabel.
 */
export const navGroups: NavGroup[] = [
  {
    label: "Main Menu",
    items: [
      {
        title: "Overview",
        url: "/admin/dashboard/overview",
        icon: "dashboard",
        isActive: false,
        shortcut: ["d", "d"],
        items: [],
      },
      {
        title: "Users",
        url: "/admin/dashboard/users",
        icon: "teams",
        shortcut: ["u", "u"],
        isActive: false,
        items: [],
      },
      {
        title: "Stores",
        url: "/admin/dashboard/stores",
        icon: "store",
        shortcut: ["s", "t"],
        isActive: false,
        items: [],
      },
      {
        title: "Reports",
        url: "/admin/dashboard/reports",
        icon: "forms",
        shortcut: ["r", "r"],
        isActive: false,
        items: [],
      },
      {
        title: "Need Support",
        url: "/admin/dashboard/support",
        icon: "help",
        shortcut: ["n", "s"],
        isActive: false,
        items: [],
      },
      {
        title: "Kendala",
        url: "/admin/dashboard/kendala",
        icon: "warning",
        shortcut: ["k", "d"],
        isActive: false,
        items: [],
      },
    ],
  },
];
