import type { Config, Context } from "@netlify/functions";
import { handle } from "../../server/router.ts";

export default async (req: Request, context: Context) => handle(req, context.ip ?? "unknown");

export const config: Config = {
  path: "/api/*",
};
