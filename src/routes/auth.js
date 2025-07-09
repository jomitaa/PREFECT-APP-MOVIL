import express from "express";
import { login, verifyOTP } from "../controllers/authController.js";
import { obtenerHorarios } from "../controllers/horarioController.js"; 
import { actualizarDatos, verificarCodigoJefe } from "../controllers/asistenciaController.js";
import { agregarReporte } from "../controllers/reporteController.js";
import { filtros } from "../controllers/filtrosController.js";

const router = express.Router();


router.post("/login", login);
router.post("/verify-otp", verifyOTP); 
router.get("/horarios", obtenerHorarios); 
router.post("/actualizarDatos", actualizarDatos);
router.post("/verificarCodigoJefe", verificarCodigoJefe);
router.post("/agregarReporte", agregarReporte); 
router.get("/filtros", filtros); // Agregar la ruta para obtener los filtros

export default router;
