import type * as t from "@babel/types";
import type { BabelNode } from "../../types/babel.js";

export function insertHelperStatements(ast: object, helpers: t.Statement[]): void {
    const program = (ast as { program?: { body?: BabelNode[] } }).program;

    if (program?.body === undefined) {
        return;
    }

    let insertAt = 0;

    while (insertAt < program.body.length && program.body[insertAt].type === "ImportDeclaration") {
        insertAt++;
    }

    program.body.splice(insertAt, 0, ...(helpers as unknown as BabelNode[]));
}
