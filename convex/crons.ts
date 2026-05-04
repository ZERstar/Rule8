import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "integration-health-check",
  { minutes: 15 },
  internal.integrations.healthCheck,
  {},
);

crons.cron(
  "weekly-digest",
  "0 9 * * 1",
  internal.digest.sendWeeklyDigest,
  {},
);

crons.interval(
  "signal-clustering",
  { hours: 12 },
  internal.signals.clusterSignalsAllWorkspaces,
  {},
);

crons.interval(
  "anomaly-detection",
  { minutes: 30 },
  internal.signals.checkAnomaliesAllWorkspaces,
  {},
);

export default crons;
