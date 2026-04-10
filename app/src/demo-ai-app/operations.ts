import type { PrismaPromise } from "@prisma/client";
import OpenAI from "openai";
import type { GptResponse, Task, User } from "wasp/entities";
import { HttpError, prisma } from "wasp/server";
import type {
  CreateTask,
  DeleteTask,
  GenerateGptResponse,
  GetAllTasksByUser,
  GetGptResponses,
  UpdateTask,
} from "wasp/server/operations";
import * as z from "zod";
import { SubscriptionStatus } from "../payment/plans";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ProjectBreakdown } from "./schedule";

const client = setUpNvidiaClient();
function setUpNvidiaClient(): OpenAI {
  if (process.env.NVIDIA_API_KEY) {
    return new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });
  } else {
    throw new Error("NVIDIA API key is not set");
  }
}

const generateGptResponseInputSchema = z.object({
  projectGoal: z.string().nonempty(),
});

type GenerateGptResponseInput = z.infer<typeof generateGptResponseInputSchema>;

export const generateGptResponse: GenerateGptResponse<
  GenerateGptResponseInput,
  ProjectBreakdown
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(
      401,
      "Only authenticated users are allowed to perform this operation",
    );
  }

  const { projectGoal } = ensureArgsSchemaOrThrowHttpError(
    generateGptResponseInputSchema,
    rawArgs,
  );

  console.log("Calling NVIDIA NIM API");
  const breakdown = await generateProjectBreakdown(projectGoal);
  if (breakdown === null) {
    throw new HttpError(
      500,
      "Encountered a problem in communication with AI service",
    );
  }

  const createResponse = context.entities.GptResponse.create({
    data: {
      user: { connect: { id: context.user.id } },
      content: JSON.stringify(breakdown),
    },
  });

  const transactions: PrismaPromise<GptResponse | User>[] = [createResponse];

  if (!isUserSubscribed(context.user)) {
    if (context.user.credits > 0) {
      const decrementCredit = context.entities.User.update({
        where: { id: context.user.id },
        data: {
          credits: {
            decrement: 1,
          },
        },
      });
      transactions.push(decrementCredit);
    } else {
      throw new HttpError(
        402,
        "User has no subscription and is out of credits",
      );
    }
  }

  console.log("Decrementing credits and saving response");
  await prisma.$transaction(transactions);

  return breakdown;
};

function isUserSubscribed(user: User) {
  return (
    user.subscriptionStatus === SubscriptionStatus.Active ||
    user.subscriptionStatus === SubscriptionStatus.CancelAtPeriodEnd
  );
}

const createTaskInputSchema = z.object({
  description: z.string().nonempty(),
});

type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const createTask: CreateTask<CreateTaskInput, Task> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { description } = ensureArgsSchemaOrThrowHttpError(
    createTaskInputSchema,
    rawArgs,
  );

  const task = await context.entities.Task.create({
    data: {
      description,
      user: { connect: { id: context.user.id } },
    },
  });

  return task;
};

const updateTaskInputSchema = z.object({
  id: z.string().nonempty(),
  isDone: z.boolean().optional(),
  time: z.string().optional(),
});

type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

export const updateTask: UpdateTask<UpdateTaskInput, Task> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { id, isDone, time } = ensureArgsSchemaOrThrowHttpError(
    updateTaskInputSchema,
    rawArgs,
  );

  const task = await context.entities.Task.update({
    where: {
      id,
      user: {
        id: context.user.id,
      },
    },
    data: {
      isDone,
      time,
    },
  });

  return task;
};

const deleteTaskInputSchema = z.object({
  id: z.string().nonempty(),
});

type DeleteTaskInput = z.infer<typeof deleteTaskInputSchema>;

export const deleteTask: DeleteTask<DeleteTaskInput, Task> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { id } = ensureArgsSchemaOrThrowHttpError(
    deleteTaskInputSchema,
    rawArgs,
  );

  const task = await context.entities.Task.delete({
    where: {
      id,
      user: {
        id: context.user.id,
      },
    },
  });

  return task;
};

export const getGptResponses: GetGptResponses<void, GptResponse[]> = async (
  _args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  return context.entities.GptResponse.findMany({
    where: {
      user: {
        id: context.user.id,
      },
    },
  });
};

export const getAllTasksByUser: GetAllTasksByUser<void, Task[]> = async (
  _args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  return context.entities.Task.findMany({
    where: {
      user: {
        id: context.user.id,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

async function generateProjectBreakdown(
  projectGoal: string,
): Promise<ProjectBreakdown | null> {
  const completion = await client.chat.completions.create({
    model: "google/gemma-4-31b-it",
    messages: [
      {
        role: "system",
        content: `You are an expert project planner and technical architect. Given a project goal, you will break it down into a structured plan with three priority phases.

You MUST respond with ONLY a valid JSON object in this exact format, with no other text before or after:

{
  "phases": [
    {
      "priority": "high",
      "label": "MVP 必须完成",
      "tasks": [
        {
          "description": "Task description",
          "time": "2 周"
        }
      ]
    },
    {
      "priority": "medium",
      "label": "上线前应完成",
      "tasks": [
        {
          "description": "Task description",
          "time": "3 天"
        }
      ]
    },
    {
      "priority": "low",
      "label": "后续迭代可做",
      "tasks": [
        {
          "description": "Task description",
          "time": "1 周"
        }
      ]
    }
  ]
}

Rules:
- Always include exactly 3 phases with priorities: "high", "medium", "low"
- The high priority phase label must be "MVP 必须完成"
- The medium priority phase label must be "上线前应完成"
- The low priority phase label must be "后续迭代可做"
- Each phase should have 3-6 specific, actionable tasks
- Time estimates should use "天" (days) or "周" (weeks) as units
- Tasks should be realistic and technically specific
- Respond ONLY with the JSON, no markdown, no code fences, no explanation`,
      },
      {
        role: "user",
        content: `Please break down this project into a structured plan: ${projectGoal}`,
      },
    ],
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content || "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("No JSON found in AI response:", content);
    return null;
  }

  try {
    return JSON.parse(jsonMatch[0]) as ProjectBreakdown;
  } catch (e) {
    console.error("Failed to parse AI response as JSON:", e);
    return null;
  }
}
