import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles.css";

const root = document.getElementById("app");

if (root === null) {
    throw new Error("Missing app root");
}

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>
);
