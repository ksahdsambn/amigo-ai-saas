export type TaskPriority = "high" | "medium" | "low";

export type ProjectBreakdown = {
  phases: Phase[];
};

export type Phase = {
  priority: TaskPriority;
  label: string;
  tasks: PhaseTask[];
};

export type PhaseTask = {
  description: string;
  time: string;
};
