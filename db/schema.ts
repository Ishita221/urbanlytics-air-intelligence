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
export const snapshots=sqliteTable('snapshots',{
 id:text('id').primaryKey(),locationKey:text('location_key').notNull(),name:text('name').notNull(),validAt:integer('valid_at').notNull(),retrievedAt:integer('retrieved_at').notNull(),payload:text('payload').notNull(),
},t=>[index('snapshot_location_time').on(t.locationKey,t.validAt)]);
export const ingestionRuns=sqliteTable('ingestion_runs',{
 id:text('id').primaryKey(),locationKey:text('location_key').notNull(),status:text('status').notNull(),startedAt:integer('started_at').notNull(),durationMs:integer('duration_ms').notNull(),
},t=>[index('ingestion_time').on(t.startedAt)]);
export const ingestionLeases=sqliteTable('ingestion_leases',{
 key:text('key').primaryKey(),token:text('token').notNull(),expires:integer('expires').notNull(),
});
