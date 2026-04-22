import { prefix, suffix } from "./shared.js";

function buildMessage(): string {
    return `${prefix}:${suffix()}`;
}

console.log(buildMessage());
