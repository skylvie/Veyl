import { traverse } from "../babel/interop.js";
import type { BabelNodePath, BabelScope } from "../types/babel.js";
import type { NameGenerator } from "../utils/random.js";

interface RenameBindingsOptions {
    onRename?: (oldName: string, newName: string) => void;
}

// Renames locally scoped bindings throughout the AST
export function renameBindings(
    ast: object,
    names: NameGenerator,
    options: RenameBindingsOptions = {}
): number {
    const seenScopes = new WeakSet<BabelScope>();
    let renameCount = 0;

    traverse(ast, {
        Scopable: {
            enter(nodePath: BabelNodePath) {
                const { scope } = nodePath;

                if (seenScopes.has(scope)) {
                    return;
                }

                seenScopes.add(scope);
                scope.crawl();

                const bindingNames = Object.keys(scope.bindings);

                for (const bindingName of bindingNames) {
                    if (scope.hasOwnBinding(bindingName)) {
                        const nextName = names.freshIdentifier();
                        scope.rename(bindingName, nextName);
                        options.onRename?.(bindingName, nextName);
                        renameCount++;
                    }
                }
            },
        },
    });

    return renameCount;
}
