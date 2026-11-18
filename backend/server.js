// MiniGENIOS · servidor (Express + PostgreSQL)
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

/* Carga el archivo .env (si existe). Si no existe, sigue con secret.txt */
try { process.loadEnvFile(path.join(__dirname, ".env")); } catch {}

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const { rateLimit } = require("express-rate-limit");

const PORT = process.env.PORT || 3000;

/* Clave secreta para los tokens: primero .env, si no, secret.txt (se crea sola) */
const RUTA_SECRETO = path.join(__dirname, "secret.txt");
let SECRETO = process.env.JWT_SECRET;
if (!SECRETO) {
  if (!fs.existsSync(RUTA_SECRETO)) fs.writeFileSync(RUTA_SECRETO, crypto.randomBytes(48).toString("hex"));
  SECRETO = fs.readFileSync(RUTA_SECRETO, "utf8").trim();
}

/* Base de datos (las tablas se crean en pgAdmin, ver schema) */
const db = new Pool({ connectionString: process.env.DATABASE_URL });

/* App */
const app = express();
app.use(cors());
app.use(express.json({ limit: "10kb" }));

const limitarAcceso = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: "Demasiados intentos. Espera unos minutos y prueba otra vez." }
});

/* Para que los errores de funciones async lleguen al manejador de errores */
const ruta = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const MODOS = ["practica", "relampago", "vidas"];
const TEMAS = ["+", "-", "×", "÷", "comparar", "patrones", "figuras", "fracciones", "decimales",
               "porcentajes", "perimetro", "area", "problemas", "mixto"];

function crearToken(usuario) {
  return jwt.sign({ id: usuario.id }, SECRETO, { expiresIn: "30d" });
}

const requiereSesion = ruta(async (req, res, next) => {
  const cabecera = req.headers.authorization || "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Inicia sesión primero." });
  let id;
  try {
    ({ id } = jwt.verify(token, SECRETO));
  } catch (e) {
    return res.status(401).json({ error: "Tu sesión venció. Entra otra vez." });
  }
  const { rows } = await db.query("SELECT id, nombre FROM usuarios WHERE id = $1", [id]);
  if (!rows[0]) return res.status(401).json({ error: "Tu sesión ya no es válida." });
  req.usuario = rows[0];
  next();
});

function validarCredenciales(body) {
  const nombre = typeof body.nombre === "string" ? body.nombre.trim().replace(/\s+/g, " ") : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (nombre.length < 2 || nombre.length > 20) return { error: "El nombre debe tener entre 2 y 20 letras." };
  if (password.length < 4 || password.length > 40) return { error: "La contraseña debe tener entre 4 y 40 caracteres." };
  return { nombre, password };
}

const MSG_NOMBRE_EXISTE = "Ese nombre ya existe. Entra con tu contraseña o elige otro nombre.";

/* Cuentas */
app.post("/api/registro", limitarAcceso, ruta(async (req, res) => {
  const c = validarCredenciales(req.body || {});
  if (c.error) return res.status(400).json({ error: c.error });
  const hash = await bcrypt.hash(c.password, 10);
  try {
    const { rows } = await db.query(
      "INSERT INTO usuarios (nombre, password_hash, creado) VALUES ($1, $2, $3) RETURNING id, nombre",
      [c.nombre, hash, Date.now()]
    );
    const usuario = { id: rows[0].id, nombre: rows[0].nombre };
    res.status(201).json({ token: crearToken(usuario), usuario });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: MSG_NOMBRE_EXISTE });
    throw e;
  }
}));

app.post("/api/login", limitarAcceso, ruta(async (req, res) => {
  const c = validarCredenciales(req.body || {});
  if (c.error) return res.status(400).json({ error: c.error });
  const { rows } = await db.query("SELECT * FROM usuarios WHERE LOWER(nombre) = LOWER($1)", [c.nombre]);
  const fila = rows[0];
  if (!fila) return res.status(404).json({ error: "No encontramos a ese jugador. Revisa tu nombre o crea tu cuenta." });
  const ok = await bcrypt.compare(c.password, fila.password_hash);
  if (!ok) return res.status(401).json({ error: "Contraseña incorrecta. Prueba otra vez." });
  const usuario = { id: fila.id, nombre: fila.nombre };
  res.json({ token: crearToken(usuario), usuario });
}));

app.get("/api/yo", requiereSesion, (req, res) => {
  res.json({ usuario: req.usuario });
});

/* Partidas, notas y récords */
app.post("/api/partidas", requiereSesion, ruta(async (req, res) => {
  const { modo, tema, nivel, aciertos, total } = req.body || {};
  const totalOk = total === null || total === undefined ? null : total;
  const valido =
    MODOS.includes(modo) && TEMAS.includes(tema) &&
    Number.isInteger(nivel) && nivel >= 1 && nivel <= 3 &&
    Number.isInteger(aciertos) && aciertos >= 0 && aciertos <= 200 &&
    (totalOk === null || (Number.isInteger(totalOk) && totalOk >= 1 && totalOk <= 100 && aciertos <= totalOk));
  if (!valido) return res.status(400).json({ error: "Datos de partida no válidos." });

  const previo = await db.query(
    "SELECT COALESCE(MAX(aciertos), 0) AS mejor FROM partidas WHERE usuario_id = $1 AND modo = $2 AND nivel = $3",
    [req.usuario.id, modo, nivel]
  );
  const anterior = previo.rows[0].mejor;
  await db.query(
    "INSERT INTO partidas (usuario_id, modo, tema, nivel, aciertos, total, fecha) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [req.usuario.id, modo, tema, nivel, aciertos, totalOk, Date.now()]
  );
  res.status(201).json({ ok: true, nuevoRecord: modo !== "practica" && aciertos > anterior && aciertos > 0 });
}));

app.get("/api/partidas", requiereSesion, ruta(async (req, res) => {
  const [resumen, ultimas] = await Promise.all([
    db.query(
      "SELECT COUNT(*)::int AS partidas, AVG(CASE WHEN modo = 'practica' THEN aciertos END)::float8 AS promedio FROM partidas WHERE usuario_id = $1",
      [req.usuario.id]
    ),
    db.query(
      "SELECT fecha::float8 AS f, modo, tema, nivel, aciertos, total FROM partidas WHERE usuario_id = $1 ORDER BY fecha DESC, id DESC LIMIT 30",
      [req.usuario.id]
    )
  ]);
  const r = resumen.rows[0];
  res.json({
    partidas: ultimas.rows,
    total: r.partidas,
    promedioPractica: r.promedio === null ? null : Math.round(r.promedio * 10) / 10
  });
}));

app.get("/api/records", requiereSesion, ruta(async (req, res) => {
  const { rows } = await db.query(
    "SELECT modo, nivel, MAX(aciertos) AS mejor FROM partidas WHERE usuario_id = $1 AND modo != 'practica' GROUP BY modo, nivel",
    [req.usuario.id]
  );
  const mapa = {};
  for (const f of rows) mapa[`${f.modo}-${f.nivel}`] = f.mejor;
  res.json(mapa);
}));

app.use("/api", (req, res) => res.status(404).json({ error: "Ruta no encontrada." }));

/* Página */
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Algo falló en el servidor." });
});

app.listen(PORT, () => console.log(`MiniGENIOS listo en http://localhost:${PORT}`));