import { CheckCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "wasp/client/auth";
import { generateCheckoutSession, getCustomerPortalUrl, useQuery, } from "wasp/client/operations";
import { Alert, AlertDescription } from "../client/components/ui/alert";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardFooter, CardTitle, } from "../client/components/ui/card";
import { cn } from "../client/utils";
import { PaymentPlanId, SubscriptionStatus, } from "./plans";
const bestDealPaymentPlanId = PaymentPlanId.Pro;
export const paymentPlanCards = {
    free: {
        name: "Free",
        monthlyPrice: "$0",
        yearlyPrice: "$0",
        description: "Try it out",
        features: ["3 credits one-time", "No ZeroClaw instance", "Basic features"],
    },
    [PaymentPlanId.Hobby]: {
        name: "Hobby",
        monthlyPrice: "$3.99",
        yearlyPrice: "$9.99",
        description: "Your own AI agent",
        features: [
            "Bring your own API key",
            "ZeroClaw instance on Server B",
            "30-day free trial (monthly)",
            "Extra 30 days (yearly)",
        ],
    },
    [PaymentPlanId.Pro]: {
        name: "Pro",
        monthlyPrice: "$6.99",
        yearlyPrice: "$16.99",
        description: "Best value for power users",
        features: [
            "Bring your own API key",
            "ZeroClaw instance on Server B",
            "14-day free trial (monthly)",
            "Extra 14 days (yearly)",
        ],
    },
};
const planOrder = ["free", PaymentPlanId.Hobby, PaymentPlanId.Pro];
const PricingPage = () => {
    const [billingCycle, setBillingCycle] = useState("monthly");
    const [isPaymentLoading, setIsPaymentLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const { data: user } = useAuth();
    const isUserSubscribed = !!user &&
        !!user.subscriptionStatus &&
        user.subscriptionStatus !== SubscriptionStatus.Deleted;
    const { data: customerPortalUrl, isLoading: isCustomerPortalUrlLoading, error: customerPortalUrlError, } = useQuery(getCustomerPortalUrl, { enabled: isUserSubscribed });
    const navigate = useNavigate();
    async function handleBuyNowClick(paymentPlanId, billingCycle) {
        if (!user) {
            navigate("/login");
            return;
        }
        try {
            setIsPaymentLoading(true);
            const checkoutResults = await generateCheckoutSession({
                planId: paymentPlanId,
                billingCycle,
            });
            if (checkoutResults?.sessionUrl) {
                window.open(checkoutResults.sessionUrl, "_self");
            }
            else {
                throw new Error("Error generating checkout session URL");
            }
        }
        catch (error) {
            console.error(error);
            if (error instanceof Error) {
                setErrorMessage(error.message);
            }
            else {
                setErrorMessage("Error processing payment. Please try again later.");
            }
            setIsPaymentLoading(false);
        }
    }
    const handleCustomerPortalClick = () => {
        if (!user) {
            navigate("/login");
            return;
        }
        if (customerPortalUrlError) {
            setErrorMessage("Error fetching Customer Portal URL");
            return;
        }
        if (!customerPortalUrl) {
            setErrorMessage(`Customer Portal does not exist for user ${user.id}`);
            return;
        }
        window.open(customerPortalUrl, "_blank");
    };
    return (<div className="py-10 lg:mt-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div id="pricing" className="mx-auto max-w-4xl text-center">
          <h2 className="text-foreground mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Pick your <span className="text-primary">pricing</span>
          </h2>
        </div>
        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-center text-lg leading-8">
          Choose the plan that fits your needs. Start for free or upgrade to unlock your own AI agent powered by Amigo.
        </p>
        {errorMessage && (<Alert variant="destructive" className="mt-8">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>)}
        <div className="mx-auto mt-10 flex justify-center gap-2">
          <Button variant={billingCycle === "monthly" ? "default" : "outline"} onClick={() => setBillingCycle("monthly")}>
            Monthly
          </Button>
          <div className="flex flex-col items-center">
            <Button variant={billingCycle === "yearly" ? "default" : "outline"} onClick={() => setBillingCycle("yearly")}>
              Yearly
            </Button>
            <span className="text-xs text-green-600 dark:text-green-400 mt-1">
              Save up to 80%
            </span>
          </div>
        </div>
        <div className="isolate mx-auto mt-8 grid max-w-md grid-cols-1 gap-y-8 sm:mt-10 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8">
          {planOrder.map((planKey) => {
            const card = paymentPlanCards[planKey];
            const isFree = planKey === "free";
            const price = isFree
                ? "$0"
                : billingCycle === "monthly"
                    ? card.monthlyPrice
                    : card.yearlyPrice;
            const suffix = isFree
                ? ""
                : billingCycle === "monthly"
                    ? "/month"
                    : "/year";
            return (<Card key={planKey} className={cn("relative flex grow flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-lg", {
                    "ring-primary bg-transparent! ring-2": planKey === bestDealPaymentPlanId,
                    "ring-border ring-1 lg:my-8": planKey !== bestDealPaymentPlanId,
                })}>
                {planKey === bestDealPaymentPlanId && (<div className="absolute top-0 right-0 -z-10 h-full w-full transform-gpu blur-3xl" aria-hidden="true">
                    <div className="from-primary/40 via-primary/20 to-primary/10 absolute h-full w-full bg-linear-to-br opacity-30" style={{
                        clipPath: "circle(670% at 50% 50%)",
                    }}/>
                  </div>)}
                <CardContent className="h-full justify-between p-8 xl:p-10">
                  <div className="flex items-center justify-between gap-x-4">
                    <CardTitle id={planKey} className="text-foreground text-lg leading-8 font-semibold">
                      {card.name}
                    </CardTitle>
                  </div>
                  <p className="text-muted-foreground mt-4 text-sm leading-6">
                    {card.description}
                  </p>
                  <p className="mt-6 flex items-baseline gap-x-1">
                    <span className="text-foreground text-4xl font-bold tracking-tight">
                      {price}
                    </span>
                    <span className="text-muted-foreground text-sm leading-6 font-semibold">
                      {suffix}
                    </span>
                  </p>
                  <ul role="list" className="text-muted-foreground mt-8 space-y-3 text-sm leading-6">
                    {card.features.map((feature) => (<li key={feature} className="flex gap-x-3">
                        <CheckCircle className="text-primary h-5 w-5 flex-none" aria-hidden="true"/>
                        {feature}
                      </li>))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isFree ? (!user ? (<Button onClick={() => navigate("/signup")} variant="outline" className="w-full">
                        Get Started
                      </Button>) : (<Button disabled variant="outline" className="w-full">
                        Current Plan
                      </Button>)) : isUserSubscribed ? (<Button onClick={handleCustomerPortalClick} disabled={isCustomerPortalUrlLoading} aria-describedby="manage-subscription" variant={planKey === bestDealPaymentPlanId ? "default" : "outline"} className="w-full">
                      Manage Subscription
                    </Button>) : (<Button onClick={() => handleBuyNowClick(planKey, billingCycle)} aria-describedby={planKey} variant={planKey === bestDealPaymentPlanId ? "default" : "outline"} className="w-full" disabled={isPaymentLoading}>
                      {!!user ? "Buy plan" : "Log in to buy plan"}
                    </Button>)}
                </CardFooter>
              </Card>);
        })}
        </div>
      </div>
    </div>);
};
export default PricingPage;
//# sourceMappingURL=PricingPage.jsx.map