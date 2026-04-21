const RESET = "\u001B[0m";

function wrap(code: string, value: string): string {
    return `${code}${value}${RESET}`;
}

function bold(value: string): string {
    return wrap("\u001B[1m", value);
}

function blue(value: string): string {
    return wrap("\u001B[34m", value);
}

function cyan(value: string): string {
    return wrap("\u001B[36m", value);
}

function gray(value: string): string {
    return wrap("\u001B[90m", value);
}

function green(value: string): string {
    return wrap("\u001B[32m", value);
}

function red(value: string): string {
    return wrap("\u001B[31m", value);
}

export const color = {
    bold,
    blue,
    cyan,
    gray,
    green,
    red,
};
