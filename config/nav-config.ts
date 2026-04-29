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
        items: []
      },
      {
        title: "Users",
        url: "/admin/dashboard/users",
        icon: "teams",
        shortcut: ["u", "u"],
        isActive: false,
        items: []
      },
      {
        title: "WhatsApp",
        url: "/admin/dashboard/whatsapp",
        icon: "chat",
        shortcut: ["w", "a"],
        isActive: false,
        items: []
      }
    ]
  }
];
