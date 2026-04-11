import { routes } from "wasp/client/router";
import { BlogUrl, DocsUrl } from "../../../shared/common";
const staticNavigationItems = [
    { name: "Documentation", to: DocsUrl },
    { name: "Blog", to: BlogUrl },
];
export const marketingNavigationItems = [
    { name: "Features", to: "/#features" },
    { name: "Pricing", to: routes.PricingPageRoute.to },
    ...staticNavigationItems,
];
export const demoNavigationitems = [
    { name: "ZeroClaw", to: routes.ZeroclawRoute.to },
    { name: "Agent Examples", to: routes.DemoAppRoute.to },
    ...staticNavigationItems,
];
//# sourceMappingURL=constants.js.map