import Database from "better-sqlite3";
const db = new Database("c:/Users/L2PC04/Downloads/kernel-sac-actualizado (2)/kernel-sac/db/kernelsac.db");
const productos = db.prepare("SELECT id, nombre, imagen_url FROM productos").all();
console.log(JSON.stringify(productos, null, 2));
