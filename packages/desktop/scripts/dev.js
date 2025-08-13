const { spawn } = require("child_process");
const path = require("path");

console.log("🚀 Starting Billing App development environment...\n");

// Set environment variables for development
process.env.NODE_ENV = "development";
process.env.VITE_DEV_SERVER_URL = "http://localhost:3000";

let rendererProcess = null;
let mainProcess = null;

// Function to start renderer process (Vite)
function startRenderer() {
  console.log("📱 Starting renderer process (Vite)...\n");

  rendererProcess = spawn("npm", ["run", "dev:renderer"], {
    cwd: __dirname,
    stdio: "pipe",
    shell: true,
  });

  rendererProcess.stdout.on("data", (data) => {
    console.log(`[Renderer] ${data.toString().trim()}`);
  });

  rendererProcess.stderr.on("data", (data) => {
    console.error(`[Renderer Error] ${data.toString().trim()}`);
  });

  rendererProcess.on("close", (code) => {
    console.log(`🔄 Renderer process exited with code ${code}`);
    if (code !== 0) {
      console.log("❌ Renderer process failed, restarting...");
      setTimeout(startRenderer, 2000);
    }
  });
}

// Function to start main process (Electron)
function startMain() {
  console.log("🖥️  Starting main process (Electron)...\n");

  // Wait a bit for Vite to be ready and build preload
  setTimeout(() => {
    // First build the preload script
    const preloadProcess = spawn("npm", ["run", "build:preload"], {
      cwd: __dirname,
      stdio: "pipe",
      shell: true,
    });

    preloadProcess.on("close", (code) => {
      if (code === 0) {
        console.log("✅ Preload script built successfully");
        // Now start the main process
        mainProcess = spawn("npm", ["run", "start"], {
          cwd: __dirname,
          stdio: "pipe",
          shell: true,
          env: {
            ...process.env,
            VITE_DEV_SERVER_URL: "http://localhost:3000",
          },
        });

        mainProcess.stdout.on("data", (data) => {
          console.log(`[Main] ${data.toString().trim()}`);
        });

        mainProcess.stderr.on("data", (data) => {
          console.error(`[Main Error] ${data.toString().trim()}`);
        });

        mainProcess.stdout.on("data", (data) => {
          console.log(`[Main] ${data.toString().trim()}`);
        });

        mainProcess.stderr.on("data", (data) => {
          console.error(`[Main Error] ${data.toString().trim()}`);
        });

        mainProcess.on("close", (code) => {
          console.log(`🔄 Main process exited with code ${code}`);
          if (code !== 0) {
            console.log("❌ Main process failed, restarting...");
            setTimeout(startMain, 2000);
          }
        });
      } else {
        console.error("❌ Preload script build failed");
        setTimeout(startMain, 2000);
      }
    });
  }, 3000);
}

// Start both processes
startRenderer();
startMain();

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down development environment...");

  if (rendererProcess) {
    rendererProcess.kill("SIGTERM");
  }

  if (mainProcess) {
    mainProcess.kill("SIGTERM");
  }

  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down development environment...");

  if (rendererProcess) {
    rendererProcess.kill("SIGTERM");
  }

  if (mainProcess) {
    mainProcess.kill("SIGTERM");
  }

  process.exit(0);
});
