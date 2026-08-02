const LEVEL = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 } as const;
type LogLevel = (typeof LEVEL)[keyof typeof LEVEL];

let currentLevel: LogLevel = LEVEL.INFO;

export function setLevel(level: string | number): void {
  if (typeof level === "string") {
    const key = level.toUpperCase() as keyof typeof LEVEL;
    if (LEVEL[key] !== undefined) currentLevel = LEVEL[key];
  } else {
    currentLevel = level as LogLevel;
  }
}

export interface Logger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export function make(tag: string): Logger {
  const prefix = `[ScoreLinter:${tag}]`;
  return {
    debug(msg) {
      if (currentLevel <= LEVEL.DEBUG) console.log(`${prefix} ${msg}`);
    },
    info(msg) {
      if (currentLevel <= LEVEL.INFO) console.log(`${prefix} ${msg}`);
    },
    warn(msg) {
      if (currentLevel <= LEVEL.WARN) console.warn(`${prefix} ${msg}`);
    },
    error(msg) {
      console.error(`${prefix} ${msg}`);
    },
  };
}
