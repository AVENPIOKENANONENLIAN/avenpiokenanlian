import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("hidroremind.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    age INTEGER,
    weight REAL,
    activity_level TEXT,
    daily_target INTEGER,
    reminder_enabled INTEGER DEFAULT 1,
    reminder_interval INTEGER DEFAULT 60
  );

  CREATE TABLE IF NOT EXISTS water_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/profile", (req, res) => {
    const profile = db.prepare("SELECT * FROM user_profile WHERE id = 1").get();
    res.json(profile || null);
  });

  app.post("/api/profile", (req, res) => {
    const { age, weight, activity_level, daily_target } = req.body;
    const existing = db.prepare("SELECT id FROM user_profile WHERE id = 1").get();
    
    if (existing) {
      db.prepare(`
        UPDATE user_profile 
        SET age = ?, weight = ?, activity_level = ?, daily_target = ? 
        WHERE id = 1
      `).run(age, weight, activity_level, daily_target);
    } else {
      db.prepare(`
        INSERT INTO user_profile (id, age, weight, activity_level, daily_target) 
        VALUES (1, ?, ?, ?, ?)
      `).run(age, weight, activity_level, daily_target);
    }
    res.json({ success: true });
  });

  app.get("/api/logs/today", (req, res) => {
    const logs = db.prepare(`
      SELECT * FROM water_logs 
      WHERE date(timestamp) = date('now', 'localtime')
    `).all();
    res.json(logs);
  });

  app.post("/api/logs", (req, res) => {
    const { amount } = req.body;
    db.prepare("INSERT INTO water_logs (amount) VALUES (?)").run(amount);
    res.json({ success: true });
  });

  app.get("/api/stats", (req, res) => {
    const daily = db.prepare(`
      SELECT date(timestamp) as date, SUM(amount) as total 
      FROM water_logs 
      GROUP BY date(timestamp) 
      ORDER BY date DESC 
      LIMIT 30
    `).all();
    res.json(daily);
  });

  app.delete("/api/logs/:id", (req, res) => {
    db.prepare("DELETE FROM water_logs WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
