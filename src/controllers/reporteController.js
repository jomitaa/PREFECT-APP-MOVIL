import { v2 as cloudinary } from 'cloudinary';
import conexion from "../config/db.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';


dotenv.config();


// Configuración de Cloudinary (usa variables de entorno)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Para URLs HTTPS
});

// Configuración de Multer para guardar archivos temporalmente
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/evidencias';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (JPEG, PNG, etc.)'), false);
  }
};

const uploadMiddleware = multer({ 
  storage, 
  fileFilter,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  }
}).single('evidencia');

export const agregarReporte = (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    // Manejo de errores de Multer
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ 
        success: false, 
        message: err.code === 'LIMIT_FILE_SIZE' 
          ? 'La imagen es demasiado grande (máximo 10MB)' 
          : 'Error al subir la imagen'
      });
    } else if (err) {
      return res.status(400).json({ 
        success: false, 
        message: err.message || 'Error al procesar la imagen'
      });
    }

    const { id_tiporeporte, descripcion, ID_usuario, nom_usuario, id_escuela } = req.body;

    // Validación de campos obligatorios
    if (!id_tiporeporte || !descripcion || !ID_usuario || !nom_usuario) {
      return res.status(400).json({ 
        success: false, 
        message: 'Faltan datos requeridos para registrar el reporte' 
      });
    }

    try {
      let cloudinaryResult = null;
      
      // Subir a Cloudinary si hay imagen
      if (req.file) {
        try {
          cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
            folder: `prefect_app/escuela_${id_escuela}/reportes`,
            resource_type: 'auto',
            quality: 'auto:good', // Optimización automática
            format: 'webp' // Convertir a WebP para mejor compresión
          });

          // Eliminar el archivo temporal después de subir
          fs.unlinkSync(req.file.path);
        } catch (uploadError) {
          console.error('Error al subir a Cloudinary:', uploadError);
          if (req.file?.path) fs.unlinkSync(req.file.path); // Limpiar archivo temporal
          throw new Error('Error al procesar la imagen');
        }
      }

      // Insertar en base de datos
      const query = `
        INSERT INTO reportes (
          id_tiporeporte, 
          descripcion, 
          ID_usuario, 
          id_escuela, 
          fecha_reporte, 
          ruta_imagen,
          cloudinary_public_id
        ) VALUES (?, ?, ?, ?, NOW(), ?, ?)
      `;

      const [result] = await conexion.execute(query, [
        id_tiporeporte, 
        descripcion, 
        ID_usuario, 
        id_escuela,
        cloudinaryResult?.secure_url || null, // URL pública
        cloudinaryResult?.public_id || null  // ID para futuras gestiones
      ]);

      res.status(200).json({ 
        success: true, 
        message: 'Reporte agregado exitosamente', 
        reporteId: result.insertId,
        imageUrl: cloudinaryResult?.secure_url || null,
        publicId: cloudinaryResult?.public_id || null
      });

    } catch (dbError) {
      console.error('Error en la base de datos:', dbError);
      
      // Revertir la subida a Cloudinary si hubo error en la BD
      if (req.file?.path) fs.unlinkSync(req.file.path);
      
      res.status(500).json({ 
        success: false, 
        message: 'Error al guardar el reporte en la base de datos' 
      });
    }
  });
};

// Opcional: Endpoint para eliminar imágenes
export const eliminarImagen = async (req, res) => {
  const { public_id } = req.body;

  if (!public_id) {
    return res.status(400).json({ success: false, message: 'ID de imagen no proporcionado' });
  }

  try {
    const result = await cloudinary.uploader.destroy(public_id);
    
    if (result.result === 'ok') {
      return res.json({ success: true, message: 'Imagen eliminada' });
    } else {
      return res.status(404).json({ success: false, message: 'Imagen no encontrada' });
    }
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar la imagen' });
  }
};