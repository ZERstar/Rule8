"use client";

import { useAction, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useAuthenticatedQuery } from "@/lib/use-authenticated-query";
import { ROUTES } from "@/lib/routes";
import { useWorkspaceId } from "@/lib/workspace-context";

export function OnboardingRun() {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const submitTask = useAction(api.tasks.submitManualTask);
  const saveConfig = useMutation(api.workspaces.saveOnboardingConfig);
  const [taskId, setTaskId] = useState<Id<"tasks"> | null>(null);
  const traces = useAuthenticatedQuery(
    api.traces.listByTaskId,
    taskId ? { taskId } : "skip",
  );
  const [summary, setSummary] = useState("A customer is confused about setup and asks what to do next.");
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    const submittedTaskId = await submitTask({ workspaceId, summary });
    setTaskId(submittedTaskId);
    await saveConfig({ workspaceId: workspaceId as Id<"workspaces">, onboardingStep: "done" });
    setRunning(false);
  }

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-5xl gap-6 px-4 py-10 lg:grid-cols-[420px_minmax(0,1fr)]">
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--color-t3)]">First live run</p>
        <h1 className="mt-3 text-[32px] font-semibold tracking-[-0.04em]">Run one task and watch the trace</h1>
        <textarea
          className="mt-6 min-h-32 w-full rounded-[20px] border border-[var(--color-b1)] bg-white p-4 text-[14px] outline-none"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        />
        <div className="mt-4 flex gap-3">
          <Button disabled={running} onClick={() => void run()}>{running ? "Running" : "Run task"}</Button>
          <Button variant="outline" onClick={() => router.push(ROUTES.onboardingDone)}>Skip to manual</Button>
        </div>
        <button type="button" onClick={() => router.push(ROUTES.onboardingDone)} className="mt-6 text-[13px] text-[var(--color-t3)]">
          Finish setup
        </button>
      </div>
      <div className="rounded-[22px] border border-[var(--color-b1)] bg-white p-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-t3)]">Live trace feed</p>
        <div className="mt-4 space-y-3">
          {!taskId && <p className="text-[13px] text-[var(--color-t3)]">Run the task to see the agent trace here.</p>}
          {taskId && traces === undefined && <p className="text-[13px] text-[var(--color-t3)]">Loading traces for this task...</p>}
          {taskId && traces?.length === 0 && <p className="text-[13px] text-[var(--color-t3)]">The task is queued. Trace steps will appear here as agents run.</p>}
          {traces?.map((trace) => (
            <div key={trace._id} className="rounded-[16px] bg-[var(--color-surface-2)] px-3 py-3">
              <p className="text-[13px] font-semibold">{trace.action}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-t3)]">{trace.stepType} - {trace.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
