import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  waitlist: defineTable({
    email: v.string(),
    source: v.optional(v.string()),  // e.g. "hero", "footer"
    joinedAt: v.number(),             // Date.now()
    referrer: v.optional(v.string()),
  }).index('by_email', ['email']),
})
