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
