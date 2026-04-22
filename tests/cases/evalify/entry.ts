import { decorate, prefix } from "./shared.js";

function buildMessage(name: string): string {
    return decorate(`${prefix}|${name}`);
}

console.log(buildMessage("eval"));
