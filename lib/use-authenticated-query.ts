"use client";

import { useConvexAuth, useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";

export function useAuthenticatedQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: Query["_args"] | "skip",
): Query["_returnType"] | undefined {
  const { isAuthenticated } = useConvexAuth();
  const queryArgs = isAuthenticated ? args : "skip";
  return useQuery(query, queryArgs);
}
