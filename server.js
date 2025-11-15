// server.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "5mb" }));

const PUBLIC_DIR = path.join(__dirname, "public");
const SYSTEM_FILE = path.join(PUBLIC_DIR, "system.js");
const VERSION_FILE = path.join(__dirname, "version.json");
const BACKUPS_DIR = path.join(__dirname, "backups");

// Ensure folders exist
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR);
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR);

// Helper: read version.json or create default
function readVersion() {
  try {
    const raw = fs.readFileSync(VERSION_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    const v = { version: Date.now().toString() };
    fs.writeFileSync(VERSION_FILE, JSON.stringify(v, null, 2));
    return v;
  }
}

function bumpVersion() {
  const v = { version: Date.now().toString() };
  fs.writeFileSync(VERSION_FILE, JSON.stringify(v, null, 2));
  return v;
}

// Serve static
app.use(express.static(PUBLIC_DIR));

// Endpoint: version.json (already served statically if file exists; provide fallback)
app.get("/api/version", (req, res) => {
  res.json(readVersion());
});

// Endpoint: update system code (body: { code: string, note?: string })
app.post("/api/update-system", (req, res) => {
  const { code = "", note = "" } = req.body;
  if (typeof code !== "string") return res.status(400).json({ ok: false, error: "Missing code string" });

  // Backup current system.js (if exists)
  let backupName = null;
  if (fs.existsSync(SYSTEM_FILE)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    backupName = `system-backup-${timestamp}.js`;
    fs.copyFileSync(SYSTEM_FILE, path.join(BACKUPS_DIR, backupName));
  }

  // Write new system code
  fs.writeFileSync(SYSTEM_FILE, code, "utf8");

  // Bump version
  const newV = bumpVersion();

  // Save small metadata about update
  const meta = {
    time: new Date().toISOString(),
    note,
    backup: backupName,
    version: newV.version,
  };
  fs.writeFileSync(path.join(BACKUPS_DIR, `meta-${newV.version}.json`), JSON.stringify(meta, null, 2));

  return res.json({ ok: true, version: newV.version, meta });
});

// Endpoint: rollback to last backup
app.post("/api/rollback", (req, res) => {
  const backups = fs.readdirSync(BACKUPS_DIR).filter(f => f.startsWith("system-backup-")).sort().reverse();
  if (backups.length === 0) return res.status(400).json({ ok: false, error: "No backup available" });

  const last = backups[0];
  fs.copyFileSync(path.join(BACKUPS_DIR, last), SYSTEM_FILE);
  const newV = bumpVersion();
  return res.json({ ok: true, restored: last, version: newV.version });
});

// Endpoint: list history (backups)
app.get("/api/history", (req, res) => {
  const list = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.startsWith("system-backup-"))
    .map(f => ({ file: f, time: f.replace("system-backup-", "").replace(/-/g, ":") }))
    .reverse();
  res.json({ ok: true, backups: list, version: readVersion().version });
});

// Ensure there's at least an empty system.js to avoid 404
if (!fs.existsSync(SYSTEM_FILE)) {
  fs.writeFileSync(SYSTEM_FILE, "// system.js - archivo inicial\nconsole.log('system.js loaded - default');\n");
  bumpVersion();
}

// Root
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
