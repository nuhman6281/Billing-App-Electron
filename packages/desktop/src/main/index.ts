import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from "electron";
import { join } from "path";
import Store from "electron-store";
import { autoUpdater } from "electron-updater";

// Initialize electron store
const store = new Store();

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST_ELECTRON = join(__dirname, "../");
process.env.DIST = join(process.env.DIST_ELECTRON, "../dist");
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, "../public")
  : process.env.DIST;

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin
process.env.VITE_APP_TITLE =
  process.env.VITE_APP_TITLE || "Billing & Accounting App";
process.env.VITE_APP_VERSION = process.env.VITE_APP_VERSION || "1.0.0";

// Disable GPU Acceleration for Windows 7
if (process.platform === "win32") {
  app.disableHardwareAcceleration();
}

// Set application name for Windows 10+ notifications
if (process.platform === "win32") {
  app.setName(app.getName());
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
const preload = join(__dirname, "../preload/index.js");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = join(process.env.DIST, "index.html");

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    title: process.env.VITE_APP_TITLE,
    icon: join(process.env.PUBLIC || "", "favicon.ico"),
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      nodeIntegration: false,
      contextIsolation: true,

      webSecurity: true,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // Load the remote URL for development or the local html file for production.
  if (url) {
    mainWindow.loadURL(url);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(indexHtml);
  }

  // Test actively push message to the Electron-Renderer
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow?.webContents.send(
      "main-process-message",
      new Date().toLocaleString()
    );
  });

  // Make all links open with the browser, not with the application
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // On Windows you might want to show this in the default browser
    if (process.platform === "win32") {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  if (process.platform === "win32") {
    app.setAppUserModelId("com.billingapp.desktop");
  }

  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// Auto updater
if (process.env.NODE_ENV === "production") {
  autoUpdater.checkForUpdatesAndNotify();
}

// IPC handlers
ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

ipcMain.handle("get-app-name", () => {
  return app.getName();
});

ipcMain.handle("store-get", (_, key: string) => {
  return store.get(key);
});

ipcMain.handle("store-set", (_, key: string, value: any) => {
  store.set(key, value);
});

ipcMain.handle("store-delete", (_, key: string) => {
  store.delete(key);
});

ipcMain.handle("show-open-dialog", async (_, options: any) => {
  const result = await dialog.showOpenDialog(mainWindow!, options);
  return result;
});

ipcMain.handle("show-save-dialog", async (_, options: any) => {
  const result = await dialog.showSaveDialog(mainWindow!, options);
  return result;
});

ipcMain.handle("show-message-box", async (_, options: any) => {
  const result = await dialog.showMessageBox(mainWindow!, options);
  return result;
});

// Create application menu
const template: Electron.MenuItemConstructorOptions[] = [
  {
    label: "File",
    submenu: [
      {
        label: "New Company",
        accelerator: "CmdOrCtrl+N",
        click: () => {
          mainWindow?.webContents.send("menu-action", "new-company");
        },
      },
      {
        label: "Open Company",
        accelerator: "CmdOrCtrl+O",
        click: () => {
          mainWindow?.webContents.send("menu-action", "open-company");
        },
      },
      {
        label: "Save",
        accelerator: "CmdOrCtrl+S",
        click: () => {
          mainWindow?.webContents.send("menu-action", "save");
        },
      },
      { type: "separator" },
      {
        label: "Import",
        submenu: [
          {
            label: "From CSV",
            click: () => {
              mainWindow?.webContents.send("menu-action", "import-csv");
            },
          },
          {
            label: "From Excel",
            click: () => {
              mainWindow?.webContents.send("menu-action", "import-excel");
            },
          },
        ],
      },
      {
        label: "Export",
        submenu: [
          {
            label: "To PDF",
            click: () => {
              mainWindow?.webContents.send("menu-action", "export-pdf");
            },
          },
          {
            label: "To Excel",
            click: () => {
              mainWindow?.webContents.send("menu-action", "export-excel");
            },
          },
        ],
      },
      { type: "separator" },
      {
        label: "Exit",
        accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
        click: () => {
          app.quit();
        },
      },
    ],
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" },
    ],
  },
  {
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  },
  {
    label: "Window",
    submenu: [{ role: "minimize" }, { role: "close" }],
  },
  {
    label: "Help",
    submenu: [
      {
        label: "About",
        click: () => {
          mainWindow?.webContents.send("menu-action", "about");
        },
      },
      {
        label: "Documentation",
        click: () => {
          shell.openExternal("https://docs.billingapp.com");
        },
      },
      {
        label: "Support",
        click: () => {
          shell.openExternal("https://support.billingapp.com");
        },
      },
    ],
  },
];

if (process.platform === "darwin") {
  template.unshift({
    label: app.getName(),
    submenu: [
      { role: "about" },
      { type: "separator" },
      { role: "services" },
      { type: "separator" },
      { role: "hide" },
      { role: "hideOthers" },
      { role: "unhide" },
      { type: "separator" },
      { role: "quit" },
    ],
  });
}

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
