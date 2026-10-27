import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const airCache = sqliteTable('air_cache', {
  key: text('key').primaryKey(), payload: text('payload').notNull(), fetchedAt: integer('fetched_at').notNull(),
});
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(), count: integer('count').notNull(), expires: integer('expires').notNull(),
});
export const scenarios = sqliteTable('scenarios', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), name: text('name').notNull(),
  payload: text('payload').notNull(), createdAt: integer('created_at').notNull(),
}, t=>[index('scenario_owner_date').on(t.userId,t.createdAt)]);
