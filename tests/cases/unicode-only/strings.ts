export function buildBanner(userName: string): string {
    return `Hello, ${userName}!`;
}

export function getMountIds(): [string, string] {
    return ["greeting", "welcome-message"];
}
