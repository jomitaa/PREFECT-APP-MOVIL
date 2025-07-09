import conexion from "../config/db.js";
import nodemailer from "nodemailer";
import bcrypt from 'bcryptjs'; 

const otps = {}; // Almacenamiento temporal: { userName: otp }

export const login = async (req, res) => {
  const { userName, password } = req.body;

  try {
    // Consultar el usuario en la base de datos
    const [rows] = await conexion.query(
      "SELECT * FROM usuario WHERE nom_usuario = ?",
      [userName]
    );

    if (rows.length > 0) {
      const user = rows[0];

      let passwordMatch = false;

      // Verificar si la contraseña está hasheada
      if (user.contraseña.startsWith('$2')) {
        // Contraseña hasheada
        passwordMatch = await bcrypt.compare(password, user.contraseña);
      } else {
        // Contraseña en texto plano, compararla directamente
        passwordMatch = password === user.contraseña;

        if (passwordMatch) {
          // Hashear la contraseña si no está hasheada y actualizar la base de datos
          const hashedPassword = await bcrypt.hash(password, 10);
          await conexion.query(
            'UPDATE usuario SET contraseña = ? WHERE ID_usuario = ?',
            [hashedPassword, user.ID_usuario]
          );
          console.log(`Contraseña de ${userName} ha sido hasheada y actualizada.`);
        }
      }

      if (!passwordMatch) {
        return res.json({ success: false, message: "Usuario o contraseña incorrectos" });
      }

      const nom_escuela = await conexion.query(
        "SELECT nom_escuela FROM escuela WHERE id_escuela = ?",
        [user.id_escuela]
      );

      // Generar código OTP
      const otp = Math.floor(100000 + Math.random() * 900000); // 6 dígitos

      // Guardarlo temporalmente en un objeto (para pruebas, usar Redis o base de datos en producción)
      otps[userName] = otp;

      // Enviar OTP por correo
      const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.correo,
            subject: "Código de verificación",
            text: `Tu código de verificación es: ${otp}`
        };

        await transporter.sendMail(mailOptions);

      // Respuesta indicando que se requiere OTP
      res.json({
        success: true,
        message: "Login exitoso, se requiere verificación OTP",
        otpRequired: true,
        cargo: user.cargo, // Se puede usar para redirigir después de OTP
        id_escuela: user.id_escuela,
        nom_escuela: nom_escuela,
      });
    } else {
      res.json({ success: false, message: "Usuario o contraseña incorrectos" });
    }
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,  
        pass: process.env.EMAIL_PASS
    }
});



export const verifyOTP = async (req, res) => {
  const { userName, otpCode } = req.body;
  const otpGuardado = otps[userName];

  if (otpGuardado && otpGuardado.toString() === otpCode) {
    try {
      // Buscar al usuario nuevamente
      const [rows] = await conexion.query(
        "SELECT * FROM usuario WHERE nom_usuario = ?",
        [userName]
      );

     

      if (rows.length > 0) {
        const user = rows[0];

         const [escuelaRows] = await conexion.query(
  "SELECT nom_escuela FROM escuela WHERE id_escuela = ?",
  [user.id_escuela]
);
const nom_escuela = escuelaRows[0]?.nom_escuela || 'Escuela no encontrada';

        // Eliminar OTP
        delete otps[userName];

        res.json({
          success: true,
          message: "Verificación OTP exitosa",
          nom_usuario: user.nom_usuario,
          ID_usuario: user.ID_usuario,
          cargo: user.cargo,
          id_escuela: user.id_escuela,
          nom_escuela: nom_escuela
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        });
      }
    } catch (error) {
      console.error("Error en verificación OTP:", error);
      res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
  } else {
    res.json({ success: false, message: "Código OTP incorrecto o expirado" });
  }
};

