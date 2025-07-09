import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); 

app.use( authRoutes);

app.listen(3000, "0.0.0.0", () => {
  console.log("Servidor disponible en todas las IPs en el puerto 3000");
});