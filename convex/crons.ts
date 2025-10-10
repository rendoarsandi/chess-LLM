import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "check for stuck games",
  { minutes: 1 },
  internal.games.backfill,
  {
    secret: process.env.CRON_SECRET,
  }
);

export default crons;