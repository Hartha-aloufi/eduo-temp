/**
 * This file was generated by kysely-codegen.
 * Please do not edit it manually.
 */

import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Json = JsonValue;

export type JsonArray = JsonValue[];

export type JsonObject = {
  [x: string]: JsonValue | undefined;
};

export type JsonPrimitive = boolean | number | string | null;

export type JsonValue = JsonArray | JsonObject | JsonPrimitive;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface Highlights {
  created_at: Generated<Timestamp>;
  highlights: Json;
  id: Generated<string>;
  lesson_id: string;
  topic_id: string;
  updated_at: Generated<Timestamp>;
  user_id: string;
}

export interface ReadingProgress {
  created_at: Generated<Timestamp>;
  id: Generated<string>;
  last_read_paragraph: number | null;
  latest_read_paragraph: number;
  lesson_id: string;
  topic_id: string;
  updated_at: Generated<Timestamp>;
  user_id: string;
}

export interface RefreshTokens {
  created_at: Generated<Timestamp>;
  expires_at: Timestamp;
  id: Generated<string>;
  token: string;
  user_id: string;
}

export interface Users {
  created_at: Generated<Timestamp>;
  email: string;
  id: Generated<string>;
  name: string | null;
  password_hash: string;
  updated_at: Generated<Timestamp>;
}

export interface DB {
  highlights: Highlights;
  reading_progress: ReadingProgress;
  refresh_tokens: RefreshTokens;
  users: Users;
}