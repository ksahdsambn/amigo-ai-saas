import {
  generateGptResponse,
} from "wasp/client/operations";
import { Link, routes } from "wasp/client/router";

import { ArrowRight, Loader2, Lightbulb } from "lucide-react";
import { useState } from "react";
import { Button } from "../client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../client/components/ui/card";
import { Input } from "../client/components/ui/input";
import { ToastAction } from "../client/components/ui/toast";
import { toast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";
import type {
  ProjectBreakdown,
  Phase,
  PhaseTask,
  TaskPriority,
} from "./schedule";

export default function DemoAppPage() {
  return (
    <div className="py-10 lg:mt-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-foreground mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-primary">Agent</span> Examples
          </h2>
        </div>
        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-center text-lg leading-8">
          项目拆解器 — 输入你的项目目标，AI 将自动为你拆解为结构化的开发计划，按优先级分类并估算时间。
        </p>
        <Card className="bg-muted/10 my-8">
          <CardContent className="mx-auto my-8 space-y-10 px-6 py-10 sm:w-[90%] md:w-[70%] lg:w-[50%]">
            <ProjectBreakdownForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProjectBreakdownForm() {
  const [projectGoal, setProjectGoal] = useState<string>("");
  const [response, setResponse] = useState<ProjectBreakdown | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const result = await generateGptResponse({
        projectGoal,
      });
      if (result) {
        setResponse(result);
      }
    } catch (err: any) {
      if (err.statusCode === 402) {
        toast({
          title: "⚠️ You are out of credits!",
          style: {
            minWidth: "400px",
          },
          action: (
            <ToastAction
              altText="Go to pricing page to buy credits/subscription"
              asChild
            >
              <Link to={routes.PricingPageRoute.to}>
                Go to pricing page <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </ToastAction>
          ),
        });
      } else {
        toast({
          title: "Error",
          description: err.message || "Something went wrong",
          variant: "destructive",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const priorityConfig: Record<TaskPriority, { emoji: string; color: string; borderColor: string; bgColor: string; priorityLabel: string }> = {
    high: {
      emoji: "🔴",
      color: "text-red-500",
      borderColor: "border-red-500/30",
      bgColor: "bg-red-500/5",
      priorityLabel: "高优先级",
    },
    medium: {
      emoji: "🟡",
      color: "text-yellow-500",
      borderColor: "border-yellow-500/30",
      bgColor: "bg-yellow-500/5",
      priorityLabel: "中优先级",
    },
    low: {
      emoji: "🟢",
      color: "text-green-500",
      borderColor: "border-green-500/30",
      bgColor: "bg-green-500/5",
      priorityLabel: "低优先级",
    },
  };

  const priorityOrder: TaskPriority[] = ["high", "medium", "low"];

  return (
    <div className="flex flex-col justify-center gap-10">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Input
            type="text"
            id="projectGoal"
            className="flex-1"
            placeholder='输入项目目标，如 "Build a product with payment"'
            value={projectGoal}
            onChange={(e) => setProjectGoal(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && projectGoal.trim()) {
                handleGenerate();
              }
            }}
          />
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!projectGoal.trim() || isGenerating}
            variant="default"
            size="default"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 inline-block animate-spin" />
                拆解中...
              </>
            ) : (
              <>
                <Lightbulb className="mr-2 h-4 w-4" />
                拆解项目
              </>
            )}
          </Button>
        </div>
      </div>

      {!!response && (
        <div className="flex flex-col gap-4">
          <h3 className="text-foreground text-lg font-semibold">
            项目拆解结果
          </h3>
          <div className="flex flex-col gap-4">
            {priorityOrder.map((priority) => {
              const phase = response.phases?.find(
                (p) => p.priority === priority
              );
              if (!phase) return null;
              const config = priorityConfig[priority];
              return (
                <PhaseCard
                  key={priority}
                  phase={phase}
                  config={config}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PhaseCard({
  phase,
  config,
}: {
  phase: Phase;
  config: {
    emoji: string;
    color: string;
    borderColor: string;
    bgColor: string;
    priorityLabel: string;
  };
}) {
  return (
    <Card className={cn("border-2", config.borderColor, config.bgColor)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <span>{config.emoji}</span>
            <span>{phase.label}</span>
          </span>
          <span className={cn("text-xs font-medium", config.color)}>
            {config.priorityLabel}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {phase.tasks && phase.tasks.length > 0 ? (
          <ul className="space-y-2">
            {phase.tasks.map((task, index) => (
              <PhaseTaskItem key={index} task={task} />
            ))}
          </ul>
        ) : (
          <div className="text-muted-foreground text-center">
            No tasks returned. Try again.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PhaseTaskItem({ task }: { task: PhaseTask }) {
  const [isDone, setIsDone] = useState<boolean>(false);

  return (
    <li className="flex items-center justify-between gap-4 rounded-md p-2">
      <div className="flex flex-1 items-center gap-3">
        <button
          onClick={() => setIsDone(!isDone)}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
            isDone
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/40"
          )}
        >
          {isDone && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
        <span
          className={cn("text-sm leading-tight", {
            "text-muted-foreground line-through opacity-50": isDone,
          })}
        >
          {task.description}
        </span>
      </div>
      <span
        className={cn("text-muted-foreground text-sm whitespace-nowrap", {
          "line-through opacity-50": isDone,
        })}
      >
        {task.time}
      </span>
    </li>
  );
}
