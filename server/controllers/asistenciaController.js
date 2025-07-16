import conexion from "../config/db.js";

export const actualizarDatos = async (req, res) => {
    console.log("Datos recibidos en el servidor:", req.body);

    // Obtener fecha actual desde Node.js
    const fechaActual = new Date();
    const fechaSQL = fechaActual.toISOString().slice(0, 19).replace('T', ' ');
    const fechaDateOnly = fechaActual.toISOString().split('T')[0];

    console.log("Fecha que se usará en los registros:", fechaSQL);

    let { validacion_asistencia, validacion_retardo, validacion_falta, id_horario, id_escuela } = req.body;

    if (!id_horario) {
        return res.status(400).json({ error: "Falta el ID del horario" });
    }

    // Valores por defecto
    validacion_asistencia = validacion_asistencia ?? 0;
    validacion_retardo = validacion_retardo ?? 0;
    validacion_falta = validacion_falta ?? 0;

    try {
        // Verificar fecha del servidor MySQL para diagnóstico
        const [serverDate] = await conexion.query('SELECT NOW() as server_now, CURDATE() as server_today');
        console.log('Fecha servidor MySQL:', serverDate[0].server_now, '| Fecha Node.js:', fechaSQL);

        // Verificar si ya existe un registro en la tabla asistencia para el día actual
        const [asistenciaExistente] = await conexion.query(
            `SELECT * FROM asistencia WHERE id_horario = ? AND DATE(fecha_asistencia) = ? AND id_escuela = ?`,
            [id_horario, fechaDateOnly, id_escuela]
        );

        if (asistenciaExistente.length > 0) {
            await conexion.query(
                `UPDATE asistencia 
                 SET validacion_asistencia = ?, fecha_asistencia = ? 
                 WHERE id_horario = ? AND DATE(fecha_asistencia) = ? AND id_escuela = ?`,
                [validacion_asistencia, fechaSQL, id_horario, fechaDateOnly, id_escuela]
            );
        } else {
            await conexion.query(
                `INSERT INTO asistencia (id_horario, validacion_asistencia, fecha_asistencia, id_escuela) 
                 VALUES (?, ?, ?, ?)`,
                [id_horario, validacion_asistencia, fechaSQL, id_escuela]
            );
        }

        // Verificar si ya existe un registro en la tabla retardo para el día actual
        const [retardoExistente] = await conexion.query(
            `SELECT * FROM retardo WHERE id_horario = ? AND DATE(fecha_retardo) = ? AND id_escuela = ?`,
            [id_horario, fechaDateOnly, id_escuela]
        );

        if (retardoExistente.length > 0) {
            await conexion.query(
                `UPDATE retardo 
                 SET validacion_retardo = ?, fecha_retardo = ? 
                 WHERE id_horario = ? AND DATE(fecha_retardo) = ? AND id_escuela = ?`,
                [validacion_retardo, fechaSQL, id_horario, fechaDateOnly, id_escuela]
            );
        } else {
            await conexion.query(
                `INSERT INTO retardo (id_horario, validacion_retardo, fecha_retardo, id_escuela) 
                 VALUES (?, ?, ?, ?)`,
                [id_horario, validacion_retardo, fechaSQL, id_escuela]
            );
        }

        // Verificar si ya existe un registro en la tabla falta para el día actual
        const [faltaExistente] = await conexion.query(
            `SELECT * FROM falta WHERE id_horario = ? AND DATE(fecha_falta) = ? AND id_escuela = ?`,
            [id_horario, fechaDateOnly, id_escuela]
        );

        if (faltaExistente.length > 0) {
            await conexion.query(
                `UPDATE falta 
                 SET validacion_falta = ?, fecha_falta = ? 
                 WHERE id_horario = ? AND DATE(fecha_falta) = ? AND id_escuela = ?`,
                [validacion_falta, fechaSQL, id_horario, fechaDateOnly, id_escuela]
            );
        } else {
            await conexion.query(
                `INSERT INTO falta (id_horario, validacion_falta, fecha_falta, id_escuela) 
                 VALUES (?, ?, ?, ?)`,
                [id_horario, validacion_falta, fechaSQL, id_escuela]
            );
        }

        return res.send("Datos ingresados correctamente");
    } catch (error) {
        console.error("Error al actualizar los datos:", error);
        return res.status(500).json({ error: "Error en el servidor" });
    }
};

export const verificarCodigoJefe = async (req, res) => {
    let { codigo, id_escuela, id_horario, validacion_asistencia, validacion_falta, validacion_retardo } = req.body;

    // Obtener fecha actual desde Node.js
    const fechaActual = new Date();
    const fechaSQL = fechaActual.toISOString().slice(0, 19).replace('T', ' ');
    const fechaDateOnly = fechaActual.toISOString().split('T')[0];

    const codigo_jefe = codigo;
    if (!codigo || !id_escuela || !id_horario) {
        return res.status(400).json({ error: "Datos incompletos (código, escuela u horario faltante)" });
    }

    try {
        // Obtener el id_grupo del horario
        const [resultadoConsulta] = await conexion.query(
            `SELECT id_grupo FROM horario WHERE id_horario = ? AND id_escuela = ?`,
            [id_horario, id_escuela]
        );

        if (!resultadoConsulta || resultadoConsulta.length === 0) {
            return res.status(404).json({ error: "No se encontró el grupo para este horario" });
        }

        const idGrupo = resultadoConsulta[0].id_grupo;
        console.log("ID del grupo:", idGrupo);

        // Verificar el código del jefe
        const [codigoFila] = await conexion.query(
            'SELECT codigo_jefe FROM jefegrupo WHERE id_grupo = ?', 
            [idGrupo]
        );

        if (!codigoFila || codigoFila.length === 0 || codigoFila[0].codigo_jefe !== codigo_jefe) {
            return res.json({ success: false, message: "Codigo Incorrecto" });
        }

        // Valores por defecto
        validacion_asistencia = validacion_asistencia ?? 0;
        validacion_retardo = validacion_retardo ?? 0;
        validacion_falta = validacion_falta ?? 0;

        // Verificar si ya existe un registro en la tabla asistencia para el día actual
        const [asistenciaExistente] = await conexion.query(
            `SELECT * FROM asistencia WHERE id_horario = ? AND DATE(fecha_asistencia) = ? AND id_escuela = ?`,
            [id_horario, fechaDateOnly, id_escuela]
        );

        if (asistenciaExistente.length > 0) {
            await conexion.query(
                `UPDATE asistencia 
                 SET validacion_asistencia = ?, fecha_asistencia = ? 
                 WHERE id_horario = ? AND DATE(fecha_asistencia) = ? AND id_escuela = ?`,
                [validacion_asistencia, fechaSQL, id_horario, fechaDateOnly, id_escuela]
            );
        } else {
            await conexion.query(
                `INSERT INTO asistencia (id_horario, validacion_asistencia, fecha_asistencia, id_escuela) 
                 VALUES (?, ?, ?, ?)`,
                [id_horario, validacion_asistencia, fechaSQL, id_escuela]
            );
        }

        // Verificar si ya existe un registro en la tabla retardo para el día actual
        const [retardoExistente] = await conexion.query(
            `SELECT * FROM retardo WHERE id_horario = ? AND DATE(fecha_retardo) = ? AND id_escuela = ?`,
            [id_horario, fechaDateOnly, id_escuela]
        );

        if (retardoExistente.length > 0) {
            await conexion.query(
                `UPDATE retardo 
                 SET validacion_retardo = ?, fecha_retardo = ? 
                 WHERE id_horario = ? AND DATE(fecha_retardo) = ? AND id_escuela = ?`,
                [validacion_retardo, fechaSQL, id_horario, fechaDateOnly, id_escuela]
            );
        } else {
            await conexion.query(
                `INSERT INTO retardo (id_horario, validacion_retardo, fecha_retardo, id_escuela) 
                 VALUES (?, ?, ?, ?)`,
                [id_horario, validacion_retardo, fechaSQL, id_escuela]
            );
        }

        // Verificar si ya existe un registro en la tabla falta para el día actual
        const [faltaExistente] = await conexion.query(
            `SELECT * FROM falta WHERE id_horario = ? AND DATE(fecha_falta) = ? AND id_escuela = ?`,
            [id_horario, fechaDateOnly, id_escuela]
        );

        if (faltaExistente.length > 0) {
            await conexion.query(
                `UPDATE falta 
                 SET validacion_falta = ?, fecha_falta = ? 
                 WHERE id_horario = ? AND DATE(fecha_falta) = ? AND id_escuela = ?`,
                [validacion_falta, fechaSQL, id_horario, fechaDateOnly, id_escuela]
            );
        } else {
            await conexion.query(
                `INSERT INTO falta (id_horario, validacion_falta, fecha_falta, id_escuela) 
                 VALUES (?, ?, ?, ?)`,
                [id_horario, validacion_falta, fechaSQL, id_escuela]
            );
        }

        return res.json({ success: true, message: "Falta registrada correctamente" });
        
    } catch (error) {
        console.error("Error al verificar código:", error);
        return res.status(500).json({ error: "Error en el servidor" });
    }
};