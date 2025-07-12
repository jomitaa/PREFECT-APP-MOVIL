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


      if (user.cargo === "admin") {
        return res.json({
          success: false,
          message: "Esta cuenta no es de prefecto. Ingresa con una cuenta de prefecto.",
        });
      }

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
    from: `"Prefec App" <${process.env.EMAIL_USER}>`,
    to: user.correo,
    subject: "Tu código de verificación en dos pasos",
    html: `
    <!DOCTYPE html>
<html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .header {
          background-color: #4c53af;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .header h1 {
          color: white;
          margin: 0;
        }
        .content {
          background-color: white;
          padding: 30px;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .logo {
          text-align: center;
          margin-bottom: 20px;
        }
        .logo img {
          max-width: 150px;
        }
        .code-container {
          text-align: center;
          margin: 30px 0;
          padding: 20px;
          background-color: #f5f7ff;
          border-radius: 8px;
          border: 1px dashed #4c53af;
        }
        .verification-code {
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 5px;
          color: #4c53af;
          padding: 10px 20px;
          background-color: white;
          border-radius: 5px;
          display: inline-block;
          margin: 10px 0;
        }
        .info-card {
          background-color: #f5f7ff;
          border-left: 4px solid #4c53af;
          padding: 15px;
          margin: 20px 0;
          border-radius: 0 4px 4px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Prefec App</h1>
      </div>
      
      <div class="content">
        <div class="logo">
          <!-- Reemplaza con tu logo o elimina esta sección -->
          <img src="/images/PREFECT APP LOGO.png" alt="Logo Prefec App">
        </div>
        
        <h2>Verificación en Dos Pasos</h2>
        <p>Hemos recibido una solicitud para acceder a tu cuenta de Prefec App. Utiliza el siguiente código para completar el proceso:</p>
        
        <div class="code-container">
          <p>Tu código de verificación es:</p>
          <div class="verification-code">${otp}</div>
          <p>Este código expirará en 10 minutos.</p>
        </div>
        
        <div class="info-card">
          <p><strong>¿No solicitaste este código?</strong></p>
          <p>Si no fuiste tú quien solicitó este código, te recomendamos pedir el cambio de contrase;a inmediatamente.</p>
        </div>
        
        <p>Por razones de seguridad, no compartas este código con nadie. El equipo de Prefec App nunca te pedirá tu código de verificación.</p>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Prefec App. Todos los derechos reservados.</p>
          <p><small>Este es un mensaje automático, por favor no respondas a este correo.</small></p>
        </div>
      </div>
    </body>
    </html>
    `,
    text: `Verificación en Dos Pasos\n\nHemos recibido una solicitud para acceder a tu cuenta de Prefec App.\n\nTu código de verificación es: ${otpCode}\n\nEste código expirará en 10 minutos.\n\n¿No solicitaste este código? Si no fuiste tú, te recomendamos cambiar tu contraseña inmediatamente.\n\n© ${new Date().getFullYear()} Prefec App.`
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

