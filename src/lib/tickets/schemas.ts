import { z } from "zod";
import { PRIORITIES } from "./status";

export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export const reportTicketSchema = z.object({
  machineId: z.uuid(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000).optional().default(""),
  priority: z.enum(PRIORITIES).default("normal"),
  machineStopped: z
    .union([z.literal("on"), z.literal("true"), z.literal("")])
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

export type ReportTicketInput = z.infer<typeof reportTicketSchema>;

export function isAcceptedPhoto(file: File) {
  return (
    file.size > 0 &&
    file.size <= MAX_PHOTO_BYTES &&
    file.type.startsWith("image/")
  );
}

export const resolveTicketSchema = z.object({
  ticketId: z.uuid(),
  rootCause: z.string().trim().max(2000).optional().default(""),
  resolution: z.string().trim().min(3).max(5000),
});

export const PART_UNITS = ["pcs", "m", "l", "kg", "set"] as const;

export const partSchema = z.object({
  ticketId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  partNumber: z.string().trim().max(100).optional().default(""),
  quantity: z.coerce.number().positive().max(100000),
  unit: z.enum(PART_UNITS).default("pcs"),
});
