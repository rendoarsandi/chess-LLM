import { cronJobs } from "convex/server";

const crons = cronJobs();

// Cron jobs can be added here
// Example:
// crons.interval(
//   "process-ai-games",
//   { seconds: 30 },
//   internal.gameProcessor.processActiveGames
// );

export default crons;

