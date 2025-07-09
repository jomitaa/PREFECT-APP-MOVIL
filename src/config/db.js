import mysql from 'mysql2/promise'; 
import dotenv from 'dotenv';

dotenv.config();

/*
const conexion = mysql.createPool({
    host: 'localhost',
    database: 'hojaprefectos',
    user: 'root',
    password: 'jomita32'
    //password: 'n0m3l0'
    
});
*/

const conexion = mysql.createPool({
  uri: process.env.MYSQL_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verificar conexión
conexion.getConnection()
  .then(() => console.log("Conectado a MySQL en Railway"))
  .catch(err => console.error("Error conectando a la base de datos:", err));

export default conexion;
