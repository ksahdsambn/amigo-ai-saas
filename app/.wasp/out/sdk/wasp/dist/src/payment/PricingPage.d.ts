import { PaymentPlanId } from "./plans";
interface PaymentPlanCard {
    name: string;
    monthlyPrice: string;
    yearlyPrice: string;
    description: string;
    features: string[];
}
export declare const paymentPlanCards: Record<"free" | PaymentPlanId, PaymentPlanCard>;
declare const PricingPage: () => import("react").JSX.Element;
export default PricingPage;
//# sourceMappingURL=PricingPage.d.ts.map