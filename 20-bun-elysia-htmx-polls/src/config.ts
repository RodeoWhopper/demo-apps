const env = process.env;

export const config = {
  env: env.APP_ENV ?? "development",
  port: Number(env.PORT ?? 3020),
  sessionSecret: env.SESSION_SECRET ?? "change-me-demo-secret",
  dbPath: env.DB_PATH ?? "data/pulsebox.sqlite",
  adminEmails: (env.ADMIN_EMAILS ?? "admin@pulsebox.app")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  otpTtlMinutes: 10,
  sessionTtlDays: 7,
} as const;

export const isProduction = config.env === "production";

if (isProduction && config.sessionSecret === "change-me-demo-secret") {
  console.warn("[pulsebox] WARNING: SESSION_SECRET is the demo default in production. Set a real secret.");
}
