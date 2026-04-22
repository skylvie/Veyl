import { buildBanner, getMountIds } from "./strings.js";

function renderMessages(userName: string): string {
    const banner = buildBanner(userName);
    const [greetingId, welcomeId] = getMountIds();
    const welcomeMessage = "Welcome to our application.";
    const auditLog = `User greeted: ${userName}`;

    return [greetingId, welcomeId, banner, welcomeMessage, auditLog].join("|");
}

console.log(renderMessages("Sylvie"));
