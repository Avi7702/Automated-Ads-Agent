import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

/**
 * Drizzle v1 relations definition.
 *
 * Registers all schema tables for db.query.* access (RQB v2).
 * No actual inter-table relations are defined because the codebase
 * uses the standard query builder for joins, not the relational API.
 */
export const relations = defineRelations(schema);
