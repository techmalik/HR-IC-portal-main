/**
 * Lightweight structured logger. Outputs JSON lines in production
 * (parseable by log aggregators) and human-readable text in dev.
 */

const IS_PROD = process.env.NODE_ENV === "production";

type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, msg: string, meta?: Record<string, unknown>): void {
  if (IS_PROD) {
    const line: Record<string, unknown> = {
      time: new Date().toISOString(),
      level,
      msg,
      ...meta,
    };
    (level === "error" ? console.error : console.log)(JSON.stringify(line));
  } else {
    const prefix = `[${level.toUpperCase()}]`;
    const metaStr = meta && Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
    (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(
      `${prefix} ${msg}${metaStr}`,
    );
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),

  /** Create a child logger with fixed context fields merged into every emit. */
  child(ctx: Record<string, unknown>) {
    return {
      debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, { ...ctx, ...meta }),
      info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, { ...ctx, ...meta }),
      warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, { ...ctx, ...meta }),
      error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, { ...ctx, ...meta }),
    };
  },
};
