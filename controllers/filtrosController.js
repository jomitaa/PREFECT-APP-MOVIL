import conexion from "../config/db.js";

export const filtros = async (req, res) => {
    try {
        const [horarios] = await conexion.query(`
             SELECT DISTINCT
    h.id_horario,
    h.dia_horario,
    h.hora_inicio,
    h.hora_final,
    m.nom_materia,
    CONCAT(p.nom_persona, ' ', p.appat_persona) AS nombre_persona,
    g.sem_grupo,
    g.nom_grupo,
    s.id_salon,
    a.fecha_asistencia AS fecha_asistencia,
    a.validacion_asistencia AS asistencia,
    r.validacion_retardo AS retardo,
    f.validacion_falta AS falta,
    per.anio,
    per.periodo
FROM
    horario h
    INNER JOIN grupo g ON h.id_grupo = g.id_grupo
    INNER JOIN salon s ON h.id_salon = s.id_salon
    JOIN materia m ON h.id_materia = m.id_materia
    JOIN persona p ON h.id_persona = p.id_persona
    LEFT JOIN asistencia a ON h.id_horario = a.id_horario
    LEFT JOIN retardo r ON h.id_horario = r.id_horario
    LEFT JOIN falta f ON h.id_horario = f.id_horario
    JOIN contenedor c ON h.id_contenedor = c.id_contenedor
    JOIN periodos per ON c.id_periodo = per.id_periodo
        `);

        
        const salones = [...new Set(horarios.map(h => h.id_salon))];
        const dias = [...new Set(horarios.map(h => h.dia_horario))];
        const grupos = [...new Set(horarios.map(h => `${h.nom_grupo}`))];
        const profesores = [...new Set(horarios.map(h => h.nombre_persona))];
        const materias = [...new Set(horarios.map(h => h.nom_materia))];
        const horasInicio = [...new Set(horarios.map(h => h.hora_inicio))].sort();
        const horasFin = [...new Set(horarios.map(h => h.hora_final))].sort();
        const anios = [...new Set(horarios.map(h => h.anio))];
        const periodos = [...new Set(horarios.map(h => h.periodo))];


        res.json({ salones, dias, grupos, profesores, materias, horasInicio, horasFin, anios, periodos });

    } catch (error) {
        console.error('Error al obtener filtros:', error);
        res.status(500).json({ error: error.message });
    }
};