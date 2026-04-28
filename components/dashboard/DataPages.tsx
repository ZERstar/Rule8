"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SecondaryPageShell } from "@/components/dashboard/SecondaryPageShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CREW_META, WORKSPACE_ID } from "@/lib/constants";
import { ROUTES, isActiveNavPath } from "@/lib/routes";

type AgentKey = "billing" | "support" | "community";

const AGENT_LABEL: Record<AgentKey, string> = {
  billing: "Finance Agent",
  support: "Support Agent",
  community: "Community Agent",
};

const CHAMBER_LINKS = [
  { href: ROUTES.dashboardActivity, label: "Activity" },
  { href: ROUTES.dashboardEvals, label: "Eval Score" },
  { href: ROUTES.dashboardInvoices, label: "Invoices" },
  { href: ROUTES.dashboardTickets, label: "Tickets" },
];

function ChamberNav() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {CHAMBER_LINKS.map((item) => {
        const active = isActiveNavPath(pathname, item.href, false);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border px-4 py-2 text-[12px] font-semibold transition-colors"
            style={{
              borderColor: active ? "#1f2937" : "var(--color-border)",
              background: active ? "#1f2937" : "white",
              color: active ? "white" : "var(--color-t2)",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function timeAgo(ms: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function StatusPill({ status }: { status: string }) {
  const hot = status === "escalated" || status === "failed";
  return (
    <Badge
      variant="outline"
      className="rounded-full border-border/70 bg-white px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em]"
      style={{ color: hot ? "var(--color-accent-orange)" : "var(--color-t2)" }}
    >
      {status}
    </Badge>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-white/78 px-4 py-4 shadow-[0_14px_34px_rgba(28,39,49,0.05)]">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-[28px] font-semibold tracking-[-0.06em] text-foreground">{value}</p>
      <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{hint}</p>
    </div>
  );
}

export function ActivityPage() {
  const traces = useQuery(api.traces.listRecent, { workspaceId: WORKSPACE_ID, limit: 80 });
  const stats = useQuery(api.tasks.getStats, { workspaceId: WORKSPACE_ID });

  return (
    <SecondaryPageShell>
      <ChamberNav />
      <PageHeader
        eyebrow="· Activity"
        title="Live activity stream"
        description="A route-backed view for model calls, tool runs, handoffs, and policy checks coming from Convex traces."
        action={<Link className="rounded-full border border-border bg-white px-4 py-2 text-[12px] font-semibold" href={ROUTES.dashboardOverview}>Back to dashboard</Link>}
      />

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <MetricCard label="Trace rows" value={traces?.length ?? "—"} hint="Latest unique trace records." />
        <MetricCard label="Tasks today" value={stats?.tasksToday ?? "—"} hint="Tasks created in the last 24 hours." />
        <MetricCard label="Escalated" value={stats?.escalated ?? "—"} hint="Open work needing founder review." />
      </div>

      <Card className="bg-card">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Trace timeline</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border/70 p-0">
          {traces === undefined && <p className="p-6 text-sm text-muted-foreground">Loading activity...</p>}
          {traces?.length === 0 && <p className="p-6 text-sm text-muted-foreground">No activity yet.</p>}
          {traces?.map((trace) => (
            <div key={trace._id} className="grid gap-3 px-6 py-4 md:grid-cols-[150px_minmax(0,1fr)_120px]">
              <div>
                <Badge variant="outline" className="rounded-full bg-white font-mono text-[9px] uppercase tracking-[0.14em]">
                  {trace.agentTag}
                </Badge>
                <p className="mt-2 text-[11px] text-muted-foreground">{timeAgo(trace.createdAt)}</p>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground">{trace.action}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">{trace.stepType} · {trace.latencyMs}ms · ${(trace.costCents / 100).toFixed(4)}</p>
              </div>
              <div className="text-right">
                <StatusPill status={trace.status} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </SecondaryPageShell>
  );
}

export function InvoicesPage() {
  const tasks = useQuery(api.tasks.list, { workspaceId: WORKSPACE_ID });
  const invoiceTasks = useMemo(
    () => tasks?.filter((task) => task.crewTag === "finance") ?? [],
    [tasks],
  );
  const totalCents = invoiceTasks.reduce((sum, task) => sum + task.totalCostCents, 0);

  return (
    <SecondaryPageShell>
      <ChamberNav />
      <PageHeader
        eyebrow="· Invoices"
        title="Finance work queue"
        description="Finance-agent tasks that will back invoice, refund, Stripe, and payment handling views."
        action={<Link className="rounded-full border border-border bg-white px-4 py-2 text-[12px] font-semibold" href={ROUTES.dashboardOverview}>Back to dashboard</Link>}
      />

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <MetricCard label="Finance tasks" value={invoiceTasks.length} hint="Tasks routed to the finance crew." />
        <MetricCard label="Run cost" value={money(totalCents)} hint="Total model/tool cost for these rows." />
        <MetricCard label="Auto resolved" value={invoiceTasks.filter((task) => task.autoResolved).length} hint="Handled without escalation." />
      </div>

      <TaskTable
        empty="No finance tasks yet."
        tasks={invoiceTasks}
        title="Invoice and payment events"
      />
    </SecondaryPageShell>
  );
}

export function TicketsPage() {
  const tasks = useQuery(api.tasks.list, { workspaceId: WORKSPACE_ID });
  const ticketTasks = useMemo(
    () => tasks?.filter((task) => task.crewTag === "support" || task.crewTag === "community") ?? [],
    [tasks],
  );

  return (
    <SecondaryPageShell>
      <ChamberNav />
      <PageHeader
        eyebrow="· Tickets"
        title="Customer and community tickets"
        description="Support/community tasks that will back ticket triage, status, and escalation workflows."
        action={<Link className="rounded-full border border-border bg-white px-4 py-2 text-[12px] font-semibold" href={ROUTES.dashboardOverview}>Back to dashboard</Link>}
      />

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <MetricCard label="Tickets" value={ticketTasks.length} hint="Support and community task rows." />
        <MetricCard label="Escalated" value={ticketTasks.filter((task) => task.status === "escalated").length} hint="Needs founder decision." />
        <MetricCard label="Resolved" value={ticketTasks.filter((task) => task.status === "resolved").length} hint="Completed ticket work." />
      </div>

      <TaskTable
        empty="No support or community tickets yet."
        tasks={ticketTasks}
        title="Ticket queue"
      />
    </SecondaryPageShell>
  );
}

function TaskTable({
  empty,
  tasks,
  title,
}: {
  empty: string;
  tasks: Array<{
    _id: Id<"tasks">;
    crewTag: string;
    status: string;
    summary: string;
    source: string;
    userEmail?: string;
    totalCostCents: number;
    totalTokens: number;
    createdAt: number;
  }>;
  title: string;
}) {
  return (
    <Card className="bg-card">
      <CardHeader className="border-b border-border/70">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border/70 p-0">
        {tasks.length === 0 && <p className="p-6 text-sm text-muted-foreground">{empty}</p>}
        {tasks.map((task) => (
          <div key={task._id} className="grid gap-3 px-6 py-4 lg:grid-cols-[130px_minmax(0,1fr)_150px_110px]">
            <div>
              <Badge variant="outline" className="rounded-full bg-white font-mono text-[9px] uppercase tracking-[0.14em]">
                {task.crewTag}
              </Badge>
              <p className="mt-2 text-[11px] text-muted-foreground">{timeAgo(task.createdAt)}</p>
            </div>
            <div>
              <p className="text-[14px] font-semibold leading-6 text-foreground">{task.summary}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">{task.source}{task.userEmail ? ` · ${task.userEmail}` : ""}</p>
            </div>
            <div className="text-[12px] text-muted-foreground">
              <p>{task.totalTokens.toLocaleString()} tokens</p>
              <p>{money(task.totalCostCents)} run cost</p>
            </div>
            <div className="text-right">
              <StatusPill status={task.status} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function EvalsPage() {
  const agents = useQuery(api.agents.list, { workspaceId: WORKSPACE_ID });
  const [agentKey, setAgentKey] = useState<AgentKey>("support");
  const selectedAgent = agents?.find((agent) => agent.tag === agentKey);
  const cases = useQuery(
    api.evals.listCasesWithResults,
    selectedAgent ? { workspaceId: WORKSPACE_ID, agentId: selectedAgent._id } : "skip",
  );

  const passed = cases?.filter((item) => item.pass === true).length ?? 0;
  const scored = cases?.filter((item) => item.pass !== null).length ?? 0;
  const passRate = scored > 0 ? Math.round((passed / scored) * 100) : null;

  return (
    <SecondaryPageShell>
      <ChamberNav />
      <PageHeader
        eyebrow="· Eval Score"
        title="Prompt eval results"
        description="Read-only eval view backed by Convex eval cases and latest stored run results."
        action={<Link className="rounded-full border border-border bg-white px-4 py-2 text-[12px] font-semibold" href={ROUTES.dashboardPrompts}>Open prompts</Link>}
      />

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <MetricCard label="Selected agent" value={AGENT_LABEL[agentKey]} hint="Switch below to inspect another agent." />
        <MetricCard label="Eval cases" value={cases?.length ?? "—"} hint="Cases stored for this agent." />
        <MetricCard label="Pass rate" value={passRate === null ? "Pending" : `${passRate}%`} hint="Based on stored eval run rows." />
      </div>

      <Card className="bg-card">
        <CardHeader className="border-b border-border/70">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Agent eval cases</CardTitle>
            <div className="flex flex-wrap gap-2">
              {(["billing", "support", "community"] as AgentKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAgentKey(key)}
                  className="rounded-full border px-4 py-2 text-[12px] font-semibold transition-colors"
                  style={{
                    borderColor: agentKey === key ? "#1f2937" : "var(--color-border)",
                    background: agentKey === key ? "#1f2937" : "white",
                    color: agentKey === key ? "white" : "var(--color-t2)",
                  }}
                >
                  {AGENT_LABEL[key]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border/70 p-0">
          {agents === undefined && <p className="p-6 text-sm text-muted-foreground">Loading agents...</p>}
          {agents !== undefined && !selectedAgent && (
            <p className="p-6 text-sm text-muted-foreground">No matching agent exists yet. Create one from the dashboard command input.</p>
          )}
          {selectedAgent && cases === undefined && <p className="p-6 text-sm text-muted-foreground">Loading eval cases...</p>}
          {selectedAgent && cases?.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">No eval cases stored for this agent yet.</p>
          )}
          {cases?.map((item) => (
            <div key={item._id} className="grid gap-3 px-6 py-4 md:grid-cols-[minmax(0,1fr)_120px_120px]">
              <div>
                <p className="text-[14px] font-semibold text-foreground">{item.name}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">Threshold {item.passingThreshold}%</p>
              </div>
              <p className="text-[18px] font-semibold tracking-[-0.04em] text-foreground">
                {item.score === null ? "Pending" : `${item.score}%`}
              </p>
              <div className="text-right">
                <StatusPill status={item.pass === null ? "pending" : item.pass ? "pass" : "failed"} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </SecondaryPageShell>
  );
}
