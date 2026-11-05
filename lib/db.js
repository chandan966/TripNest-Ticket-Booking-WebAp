import { neon } from "@neondatabase/serverless";

export const sql = (strings, ...values) => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return neon(process.env.DATABASE_URL)(strings, ...values);
};
