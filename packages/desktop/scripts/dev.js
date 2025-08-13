const { spawn } = require("child_process");
const { join } = require("path");

console.log("🚀 Starting Billing App development environment...\n");

// Start the renderer process (Vite dev server)
console.log("📱 Starting renderer process (Vite)...");
const renderer = spawn("npm", ["run", "dev:renderer"], {
  cwd: __dirname,
  stdio: "inherit",
  shell: true,
});

// Wait a bit for Vite to start, then start Electron
setTimeout(() => {
  console.log("\n🖥️  Starting main process (Electron)...");
  const main = spawn("npm", ["run", "start"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true,
  });

  main.on("close", (code) => {
    console.log(`\n🔄 Main process exited with code ${code}`);
    renderer.kill();
    process.exit(code);
  });
}, 3000);

renderer.on("close", (code) => {
  console.log(`\n🔄 Renderer process exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down development environment...");
  renderer.kill();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down development environment...");
  renderer.kill();
  process.exit(0);
});
