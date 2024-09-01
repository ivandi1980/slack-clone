import { v } from "convex/values";
import { auth } from "./auth";
import { mutation, query } from "./_generated/server";

// Generated code:
const generateCode = () => {
  const code = Array.from(
    {
      length: 10,
    },
    () =>
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"[
        Math.floor(Math.random() * 62)
      ],
  ).join("");

  return code;
};

// This is a mutation that creates a new workspace
export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const joinCode = generateCode();

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      userId,
      joinCode,
    });

    await ctx.db.insert("members", {
      userId,
      workspaceId,
      role: "admin",
    });

    return workspaceId;
  },
});

// This is a query that gets all workspaces
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);

    if (!userId) return [];

    const members = await ctx.db
      .query("members")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    const workspaceIds = members.map((m) => m.workspaceId);
    const workspaces = [];

    for (const workspaceId of workspaceIds) {
      const workspace = await ctx.db.get(workspaceId);

      if (workspace) {
        workspaces.push(workspace);
      }
    }

    return workspaces;
  },
});

// This is a query that gets a workspace by its ID
export const getById = query({
  args: {
    id: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);

    if (!userId) {
      throw new Error("Not authenticated");
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id_", (q) =>
        q.eq("workspaceId", args.id).eq("userId", userId),
      )
      .unique();

    if (!member) return null;

    return await ctx.db.get(args.id);
  },
});
