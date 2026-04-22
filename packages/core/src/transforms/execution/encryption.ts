import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as t from "@babel/types";
import type { StringObfuscationMethod } from "@skylvi/veyl-config";
import type { RuntimeHelperOptions } from "../../types/runtime.js";
import type { NameGenerator } from "../../utils/random.js";
import { addWrappedBodyString } from "./bodyString.js";

interface EncryptionConfig {
    features: {
        encryption: {
            public_key: string | null;
            private_key: string | null;
        };
    };
    obfuscate: {
        strings: {
            method: StringObfuscationMethod;
            split_length: number;
            encode: boolean;
            unicode_escape_sequence: boolean;
        };
    };
}

export interface EncryptedPayloadResult {
    importStatements: t.ImportDeclaration[];
    setupStatements: t.Statement[];
    bodyStringExpression: t.Expression;
    wrappedStringCount: number;
}

export function hasEncryptedPayload(config: EncryptionConfig): boolean {
    return (
        config.features.encryption.public_key !== null &&
        config.features.encryption.private_key !== null
    );
}

export function buildEncryptedPayload(
    bodyCode: string,
    runtimeOptions: RuntimeHelperOptions,
    names: NameGenerator,
    config: EncryptionConfig
): EncryptedPayloadResult {
    const publicKeyPath = config.features.encryption.public_key;
    const privateKeyPath = config.features.encryption.private_key;

    if (publicKeyPath === null || privateKeyPath === null) {
        throw new Error("features.encryption requires both public_key and private_key");
    }

    const publicKey = readKeyFile(publicKeyPath, "public");
    const privateKey = readKeyFile(privateKeyPath, "private");
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
    const payload = Buffer.concat([cipher.update(bodyCode, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const encryptedKey = crypto.publicEncrypt(publicKey, aesKey);
    const wrappedStrings = [
        privateKey,
        encryptedKey.toString("base64"),
        iv.toString("base64"),
        authTag.toString("base64"),
        payload.toString("base64"),
    ].map((value) => addWrappedBodyString(runtimeOptions, names, value, config));

    const [
        privateKeyExpression,
        encryptedKeyExpression,
        ivExpression,
        authTagExpression,
        payloadExpression,
    ] = wrappedStrings;
    const createDecipherivName = names.freshIdentifier();
    const privateDecryptName = names.freshIdentifier();
    const privateKeyName = names.freshIdentifier();
    const encryptedKeyName = names.freshIdentifier();
    const ivName = names.freshIdentifier();
    const authTagName = names.freshIdentifier();
    const payloadName = names.freshIdentifier();
    const aesKeyName = names.freshIdentifier();
    const decipherName = names.freshIdentifier();
    const decryptedBodyName = names.freshIdentifier();

    return {
        importStatements: [
            t.importDeclaration(
                [
                    t.importSpecifier(
                        t.identifier(createDecipherivName),
                        t.identifier("createDecipheriv")
                    ),
                    t.importSpecifier(
                        t.identifier(privateDecryptName),
                        t.identifier("privateDecrypt")
                    ),
                ],
                t.stringLiteral("node:crypto")
            ),
        ],
        setupStatements: [
            t.variableDeclaration("const", [
                t.variableDeclarator(t.identifier(privateKeyName), privateKeyExpression),
                t.variableDeclarator(
                    t.identifier(encryptedKeyName),
                    buildBase64BufferExpression(encryptedKeyExpression)
                ),
                t.variableDeclarator(
                    t.identifier(ivName),
                    buildBase64BufferExpression(ivExpression)
                ),
                t.variableDeclarator(
                    t.identifier(authTagName),
                    buildBase64BufferExpression(authTagExpression)
                ),
                t.variableDeclarator(
                    t.identifier(payloadName),
                    buildBase64BufferExpression(payloadExpression)
                ),
                t.variableDeclarator(
                    t.identifier(aesKeyName),
                    t.callExpression(t.identifier(privateDecryptName), [
                        t.identifier(privateKeyName),
                        t.identifier(encryptedKeyName),
                    ])
                ),
                t.variableDeclarator(
                    t.identifier(decipherName),
                    t.callExpression(t.identifier(createDecipherivName), [
                        t.stringLiteral("aes-256-gcm"),
                        t.identifier(aesKeyName),
                        t.identifier(ivName),
                    ])
                ),
            ]),
            t.expressionStatement(
                t.callExpression(
                    t.memberExpression(t.identifier(decipherName), t.identifier("setAuthTag")),
                    [t.identifier(authTagName)]
                )
            ),
            t.variableDeclaration("const", [
                t.variableDeclarator(
                    t.identifier(decryptedBodyName),
                    t.callExpression(
                        t.memberExpression(
                            t.callExpression(
                                t.memberExpression(t.identifier("Buffer"), t.identifier("concat")),
                                [
                                    t.arrayExpression([
                                        t.callExpression(
                                            t.memberExpression(
                                                t.identifier(decipherName),
                                                t.identifier("update")
                                            ),
                                            [t.identifier(payloadName)]
                                        ),
                                        t.callExpression(
                                            t.memberExpression(
                                                t.identifier(decipherName),
                                                t.identifier("final")
                                            ),
                                            []
                                        ),
                                    ]),
                                ]
                            ),
                            t.identifier("toString")
                        ),
                        [t.stringLiteral("utf8")]
                    )
                ),
            ]),
        ],
        bodyStringExpression: t.identifier(decryptedBodyName),
        wrappedStringCount: wrappedStrings.length,
    };
}

function buildBase64BufferExpression(input: t.Expression): t.Expression {
    return t.callExpression(t.memberExpression(t.identifier("Buffer"), t.identifier("from")), [
        input,
        t.stringLiteral("base64"),
    ]);
}

function readKeyFile(filePath: string, label: "public" | "private"): string {
    const resolvedPath = path.resolve(filePath);

    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Encryption ${label} key file not found: ${resolvedPath}`);
    }

    return fs.readFileSync(resolvedPath, "utf8");
}
