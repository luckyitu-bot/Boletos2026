import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const db = new Database("database.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'customer')) NOT NULL DEFAULT 'customer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    size INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    uploaded_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
  );
`);

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

const adminEmail = "admin@example.com";
const existingAdmin = db.prepare("SELECT * FROM users WHERE email = ?").get(adminEmail);
if (!existingAdmin) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
    "Administrador",
    adminEmail,
    hashedPassword,
    "admin"
  );
  console.log("Default admin created: admin@example.com / admin123");
}

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Serve static files from uploads directory
  app.use('/uploads', authenticateToken, (req: any, res: any, next: any) => {
    // Basic security: only admins or the owner can access the file
    const filename = req.path.split('/').pop();
    const file: any = db.prepare("SELECT * FROM files WHERE filename = ?").get(filename);
    
    if (!file) return res.status(404).json({ error: "Arquivo não encontrado" });
    
    if (req.user.role !== 'admin' && req.user.id !== file.user_id) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    next();
  }, express.static(uploadsDir));

  // Auth Middleware
  function authenticateToken(req: any, res: any, next: any) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Token não fornecido" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Token inválido" });
      req.user = user;
      next();
    });
  }

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Acesso negado: Apenas administradores" });
    }
    next();
  };

  // API Routes
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  });

  app.post("/api/auth/register", (req, res) => {
    const { name, email, password } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
        name,
        email,
        hashedPassword,
        "customer"
      );
      res.status(201).json({ message: "Usuário registrado com sucesso" });
    } catch (error: any) {
      if (error.message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ error: "E-mail já cadastrado" });
      } else {
        res.status(500).json({ error: "Erro ao registrar usuário" });
      }
    }
  });

  // Admin Routes
  app.get("/api/admin/users", authenticateToken, isAdmin, (req, res) => {
    const users = db.prepare("SELECT id, name, email, role, created_at FROM users").all();
    res.json(users);
  });

  app.get("/api/admin/customers", authenticateToken, isAdmin, (req, res) => {
    const customers = db.prepare("SELECT id, name, email FROM users WHERE role = 'customer'").all();
    res.json(customers);
  });

  app.post("/api/admin/users", authenticateToken, isAdmin, (req, res) => {
    const { name, email, password, role } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
        name,
        email,
        hashedPassword,
        role || "customer"
      );
      res.status(201).json({ message: "Usuário criado com sucesso" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/admin/users/:id", authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    res.json({ message: "Usuário removido com sucesso" });
  });

  // File Management Routes
  app.post("/api/admin/upload", authenticateToken, isAdmin, upload.single('file'), (req: any, res) => {
    const { userIds: userIdsRaw } = req.body;
    const file = req.file;

    if (!file || !userIdsRaw) {
      return res.status(400).json({ error: "Arquivo e Clientes são obrigatórios" });
    }

    try {
      const userIds = JSON.parse(userIdsRaw);
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "Selecione pelo menos um cliente" });
      }

      const insert = db.prepare(`
        INSERT INTO files (filename, original_name, mimetype, size, user_id, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction((ids) => {
        for (const id of ids) {
          insert.run(file.filename, file.originalname, file.mimetype, file.size, id, req.user.id);
        }
      });

      transaction(userIds);

      res.status(201).json({ message: "Arquivo enviado com sucesso para " + userIds.length + " clientes" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Erro ao salvar metadados do arquivo" });
    }
  });

  app.get("/api/admin/files", authenticateToken, isAdmin, (req, res) => {
    const files = db.prepare(`
      SELECT f.*, u.name as customer_name 
      FROM files f 
      JOIN users u ON f.user_id = u.id 
      ORDER BY f.created_at DESC
    `).all();
    res.json(files);
  });

  app.delete("/api/admin/files/:id", authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;
    const file: any = db.prepare("SELECT filename FROM files WHERE id = ?").get(id);
    
    if (file) {
      db.prepare("DELETE FROM files WHERE id = ?").run(id);
      
      // Check if any other records still use this file
      const others: any = db.prepare("SELECT COUNT(*) as count FROM files WHERE filename = ?").get(file.filename);
      if (others.count === 0) {
        const filePath = path.join(uploadsDir, file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
    
    res.json({ message: "Arquivo removido com sucesso" });
  });

  // Customer File Routes
  app.get("/api/customer/files", authenticateToken, (req: any, res) => {
    const files = db.prepare(`
      SELECT id, filename, original_name, mimetype, size, created_at 
      FROM files 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(req.user.id);
    res.json(files);
  });

  // Dashboard Stats
  app.get("/api/stats", authenticateToken, (req: any, res) => {
    if (req.user.role === 'admin') {
      const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
      const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").get() as any;
      const totalFiles = db.prepare("SELECT COUNT(*) as count FROM files").get() as any;
      const recentUsers = db.prepare("SELECT name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5").all();
      
      res.json({
        totalUsers: totalUsers.count,
        totalCustomers: totalCustomers.count,
        totalFiles: totalFiles.count,
        recentUsers
      });
    } else {
      const fileCount = db.prepare("SELECT COUNT(*) as count FROM files WHERE user_id = ?").get(req.user.id) as any;
      res.json({
        message: `Bem-vindo, ${req.user.name}!`,
        role: req.user.role,
        fileCount: fileCount.count
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log("========================================");
    console.log(`🚀 SERVIDOR RODANDO`);
    console.log(`🔗 Local: http://localhost:${PORT}`);
    console.log(`📂 Diretório de Uploads: ${uploadsDir}`);
    console.log(`🗄️ Banco de Dados: SQLite (data.db)`);
    console.log("========================================");
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Erro: A porta ${PORT} já está em uso.`);
    } else {
      console.error(`❌ Erro ao iniciar o servidor:`, err);
    }
  });
}

startServer().catch(err => {
  console.error("💥 Falha crítica na inicialização do servidor:");
  console.error(err);
  process.exit(1);
});
