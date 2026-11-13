import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database("c:/Users/L2PC04/Downloads/kernel-sac-actualizado (2)/kernel-sac/db/kernelsac.db");

const email = "admin@kernelsac.com";
const password = "admin";
const nombre = "Administrador General";

const hash = bcrypt.hashSync(password, 10);

try {
  db.prepare("INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, 'admin')")
    .run(nombre, email, hash);
  console.log("Admin user created successfully.");
} catch (err) {
  if (err.message.includes("UNIQUE constraint failed")) {
    console.log("Admin user already exists. Updating password...");
    db.prepare("UPDATE usuarios SET password_hash = ?, rol = 'admin' WHERE email = ?").run(hash, email);
    console.log("Admin user updated successfully.");
  } else {
    console.error(err);
  }
}
