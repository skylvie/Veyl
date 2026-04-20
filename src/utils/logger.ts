import type { LogLevel } from "../types/config.js";
import type { CliLogger } from "../types/logger.js";

export function createLogger(logLevel: LogLevel): CliLogger {
    return {
        error(message: string): void {
            if (canLog(logLevel, "error")) {
                process.stderr.write(message);
            }
        },

        info(message: string): void {
            if (canLog(logLevel, "info")) {
                process.stdout.write(message);
            }
        },

        debug(message: string): void {
            if (canLog(logLevel, "debug")) {
                process.stdout.write(message);
            }
        },
    };
}

function canLog(current: LogLevel, requested: Exclude<LogLevel, "none">): boolean {
    const levels: Record<LogLevel, number> = {
        none: 0,
        error: 1,
        info: 2,
        debug: 3,
    };

    return levels[current] >= levels[requested];
}
