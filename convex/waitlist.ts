import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Join the waitlist — silently skips if email already exists
export const joinWaitlist = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
    referrer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate
    const existing = await ctx.db
      .query('waitlist')
      .withIndex('by_email', q => q.eq('email', args.email))
      .unique()

    if (existing) {
      return { status: 'already_registered' as const }
    }

    await ctx.db.insert('waitlist', {
      email: args.email,
      source: args.source ?? 'hero',
      referrer: args.referrer,
      joinedAt: Date.now(),
    })

    return { status: 'success' as const }
  },
})

// Total count — shown in social proof
export const getCount = query({
  args: {},
  handler: async ctx => {
    const rows = await ctx.db.query('waitlist').collect()
    return rows.length
  },
})
