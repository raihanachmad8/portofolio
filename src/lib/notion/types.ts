/**
 * Type definitions for Notion API integration.
 * @module notion-types
 */

import type { Page, RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints';

/** Database type keys */
export type DbType = 'profile' | 'projects' | 'skills' | 'experience';

/** Database schema definition */
export type DbSchema = Record<string, Record<string, unknown>>;

/** Notion property value types */
export type PropertyValue =
  | { type: 'rich_text'; rich_text: Array<{ plain_text: string }> }
  | { type: 'title'; title: Array<{ plain_text: string }> }
  | { type: 'select'; select: { name: string } | null }
  | { type: 'multi_select'; multi_select: Array<{ name: string }> }
  | { type: 'number'; number: number | null }
  | { type: 'checkbox'; checkbox: boolean }
  | { type: 'url'; url: string | null }
  | { type: 'email'; email: string | null }
  | { type: 'date'; date: { start: string } | null }
  | { type: 'formula'; formula: { type: string; string?: string; number?: number; boolean?: boolean } }
  | { type: 'rollup'; rollup: unknown }
  | { type: 'people'; people: unknown[] }
  | { type: 'relation'; relation: unknown[] }
  | { type: 'status'; status: { name: string } | null }
  | { type: 'button'; button: unknown }
  | { type: 'unique_id'; unique_id: { number: number | null; prefix: string | null } }
  | { type: 'verification'; verification: unknown }
  | { type: 'last_edited_by'; last_edited_by: unknown }
  | { type: 'last_edited_time'; last_edited_time: string }
  | { type: 'created_by'; created_by: unknown }
  | { type: 'created_time'; created_time: string }
  | { type: 'files'; files: unknown[] }
  | { type: 'external'; external: unknown }
  | { type: 'unsupported'; unsupported: Record<string, unknown> }
  | Record<string, unknown>;

/** Notion page with typed properties */
export interface NotionPage extends Page {
  properties: Record<string, PropertyValue>;
}

/** Notion rich text item */
export type NotionRichText = RichTextItemResponse;

/** Notion block types */
export type NotionBlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bulleted_list_item'
  | 'numbered_list_item'
  | 'code'
  | 'quote'
  | 'divider'
  | 'table'
  | 'table_row'
  | 'callout'
  | 'image'
  | 'toggle'
  | 'bookmark'
  | 'embed';

/** Notion block with typed content */
export interface NotionBlock {
  id: string;
  type: NotionBlockType;
  has_children: boolean;
  [key: string]: unknown;
}

/** Notion query result */
export interface NotionQueryResult {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

/** Notion data source (unified database access) */
export interface NotionDataSource {
  id: string;
  type: 'database';
  database_id: string;
}

/** Typed profile data from Notion */
export interface NotionProfileData {
  name: string;
  short_name: string;
  role_title: string;
  hero_sub: string;
  email: string;
  github: string;
  linkedin: string;
  website: string;
  cv_url: string;
  location: string;
  marquee: string[];
  about_lead: string;
  about_para_1: string;
  about_para_2: string;
  fact_1_value: number;
  fact_1_label: string;
  fact_2_value: number;
  fact_2_label: string;
  fact_3_value: number;
  fact_3_label: string;
  principle_1_title: string;
  principle_1_desc: string;
  principle_2_title: string;
  principle_2_desc: string;
  principle_3_title: string;
  principle_3_desc: string;
  available: boolean;
  ticker_items: string[];
  language: string;
  theme: string;
  site_title: string;
  site_description: string;
}

/** Typed project data from Notion */
export interface NotionProjectData {
  title: string;
  slug: string;
  category: string;
  year: number;
  description: string;
  has_ui: boolean;
  stack: string;
  github_url: string | null;
  live_url: string | null;
  featured: boolean;
  order: number;
  image_url: string | null;
}

/** Typed skill data from Notion */
export interface NotionSkillData {
  name: string;
  level: number;
  category: string;
}

/** Typed experience data from Notion */
export interface NotionExperienceData {
  title: string;
  company: string;
  period: string;
  location: string;
  detail: string;
  now: boolean;
  order: number;
}
