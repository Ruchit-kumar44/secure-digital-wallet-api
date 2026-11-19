import "dotenv/config";
import {z} from "zod"

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
});

const parsed = schema.safeParse(process.env);
if(!parsed.success){
  console.error("Invalid environment variables:", parsed.error.issues);
  process.exit(1);
}

const e = parsed.data;

export const env = {
  port: e.PORT,
  databaseUrl: e.DATABASE_URL,
  redisUrl: e.REDIS_URL,
  jwtAccessSecret: e.JWT_ACCESS_SECRET,
  accessTtlSeconds: 15 * 60,
  refreshTtlDays: 7,
}