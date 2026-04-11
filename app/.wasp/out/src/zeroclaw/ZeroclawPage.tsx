import { useQuery, useAction } from "wasp/client/operations";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { getZeroclawInstance, setZeroclawApiKey, retryProvision } from "wasp/client/operations";
import { useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "../client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../client/components/ui/card";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../client/components/ui/select";

const statusConfig: Record<string, { label: string; color: string }> = {
  provisioning: { label: "开通中...", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  active: { label: "运行中", color: "bg-green-100 text-green-800 border-green-300" },
  stopped: { label: "已停止", color: "bg-gray-100 text-gray-800 border-gray-300" },
  suspended: { label: "已暂停", color: "bg-orange-100 text-orange-800 border-orange-300" },
  failed: { label: "开通失败", color: "bg-red-100 text-red-800 border-red-300" },
};

export default function ZeroclawPage() {
  const { data: instance, isLoading, refetch } = useQuery(getZeroclawInstance);
  const saveApiKey = useAction(setZeroclawApiKey);
  const retryNow = useAction(retryProvision);

  const [provider, setProvider] = useState("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              ZeroClaw 暂未开通
            </h2>
            <p className="text-muted-foreground mb-6">
              请先完成订阅以开通您的 ZeroClaw 实例
            </p>
            <WaspRouterLink to={routes.PricingPageRoute.to}>
              <Button>前往定价页</Button>
            </WaspRouterLink>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = statusConfig[instance.status] || {
    label: instance.status,
    color: "bg-gray-100 text-gray-800 border-gray-300",
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-base font-semibold">
            ZeroClaw 实例状态
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}
            >
              {statusInfo.label}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">实例 ID</span>
            <span className="text-foreground">{instance.instanceId}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">端口</span>
            <span className="text-foreground">{instance.port}</span>
          </div>
          {instance.dashboardUrl && (
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Dashboard URL</span>
              <span className="text-foreground truncate">{instance.dashboardUrl}</span>
            </div>
          )}
          {instance.provisioningError && (
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">错误信息</span>
              <span className="text-red-600 text-xs">{instance.provisioningError}</span>
            </div>
          )}
          {instance.status === "active" && instance.dashboardUrl && (
            <div className="pt-2">
              <a href={instance.dashboardUrl} target="_blank" rel="noopener noreferrer">
                <Button className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  打开 Dashboard
                </Button>
              </a>
            </div>
          )}
          {instance.status === "failed" && (
            <div className="pt-2">
              <Button
                className="w-full"
                variant="outline"
                disabled={isRetrying}
                onClick={async () => {
                  setIsRetrying(true);
                  try {
                    await retryNow(undefined as any);
                    refetch();
                  } finally {
                    setIsRetrying(false);
                  }
                }}
              >
                {isRetrying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                重新开通
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {instance.status === "active" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              LLM API Key 配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger id="provider">
                  <SelectValue placeholder="选择 Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="google">Google Gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="输入您的 API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={isSavingKey || !apiKey}
              onClick={async () => {
                setIsSavingKey(true);
                try {
                  await saveApiKey({ provider, apiKey });
                  setApiKey("");
                } catch (error: any) {
                  console.error("Failed to save API key:", error);
                } finally {
                  setIsSavingKey(false);
                }
              }}
            >
              {isSavingKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存并激活
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
