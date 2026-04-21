export interface CliLogger {
    error(message: string): void;
    info(message: string): void;
    debug(message: string): void;
}
