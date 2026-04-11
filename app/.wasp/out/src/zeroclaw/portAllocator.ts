import { prisma } from "wasp/server";

export async function allocatePort(): Promise<{ port: number; numericId: number }> {
  const BASE_PORT = parseInt(process.env.ZEROCLOW_BASE_PORT || "42618", 10);
  const MAX_PORT = parseInt(process.env.ZEROCLOW_MAX_PORT || "65535", 10);

  const instances = await prisma.zeroclawInstance.findMany({
    where: {
      status: { not: "deleting" },
    },
    select: { numericId: true },
  });

  const usedIds = new Set(instances.map((i) => i.numericId));

  for (let id = 1; ; id++) {
    if (!usedIds.has(id)) {
      const port = BASE_PORT + id - 1;
      if (port > MAX_PORT) {
        throw new Error("No available ports: port range exhausted");
      }
      return { port, numericId: id };
    }
  }
}
