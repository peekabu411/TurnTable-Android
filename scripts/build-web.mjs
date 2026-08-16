import { access, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const webDir = resolve("web");
await access(resolve(webDir, "index.html"));
await access(resolve(webDir, "app.js"));
await access(resolve(webDir, "mobile-spotify.js"));
await mkdir(webDir, { recursive: true });
console.log("Standalone web assets are ready.");