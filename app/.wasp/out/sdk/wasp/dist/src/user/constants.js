import { LayoutDashboard, Settings, Shield, Bot } from "lucide-react";
import { routes } from "wasp/client/router";
export const userMenuItems = [
    {
        name: "ZeroClaw",
        to: routes.ZeroclawRoute.to,
        icon: Bot,
        isAdminOnly: false,
        isAuthRequired: true,
    },
    {
        name: "AI Scheduler (Demo App)",
        to: routes.DemoAppRoute.to,
        icon: LayoutDashboard,
        isAdminOnly: false,
        isAuthRequired: true,
    },
    {
        name: "Account Settings",
        to: routes.AccountRoute.to,
        icon: Settings,
        isAuthRequired: false,
        isAdminOnly: false,
    },
    {
        name: "Admin Dashboard",
        to: routes.AdminRoute.to,
        icon: Shield,
        isAuthRequired: false,
        isAdminOnly: true,
    },
];
//# sourceMappingURL=constants.js.map