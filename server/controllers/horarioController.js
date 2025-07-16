import conexion from "../config/db.js";


export const obtenerHorarios = async (req, res) => {
   const diaActual = new Date().toLocaleDateString('es-MX', { weekday: 'long' });
    const diaCapitalizado = diaActual.charAt(0).toUpperCase() + diaActual.slice(1);
    const horaDia = new Date().getHours() + ':' + String(new Date().getMinutes()).padStart(2, '0');
    const diaPrueba = diaCapitalizado;
    console.log('Día actual:', diaPrueba);
    const fechaActual = new Date();
    const anio = fechaActual.getFullYear();
    const mes = fechaActual.getMonth() + 1;
    const periodo = mes >= 1 && mes <= 6 ? 1 : 2;
    const { id_escuela } = req.query;

    console.log('Datos recibidos en /obtenerHorarios:', { diaPrueba, anio, periodo, id_escuela });

    try {
        // 1️⃣ Buscar el id_periodo actual
        const [periodoRows] = await conexion.query(
            'SELECT id_periodo FROM periodos WHERE anio = ? AND periodo = ?',
            [anio, periodo]
        );

        if (periodoRows.length === 0) {
            return res.status(404).json({ error: 'No existe el periodo actual.' });
        }

        const idPeriodo = periodoRows[0].id_periodo;

        // 2️⃣ Buscar el contenedor correspondiente
        const [contenedorRows] = await conexion.query(
            'SELECT id_contenedor FROM contenedor WHERE id_periodo = ?',
            [idPeriodo]
        );

        if (contenedorRows.length === 0) {
            return res.status(404).json({ error: 'No existe un contenedor para el periodo actual.' });
        }

        const idContenedor = contenedorRows[0].id_contenedor;

        // 3️⃣ Consulta filtrando por el contenedor actual
        const queryText = `
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
                g.id_turno,
                t.nom_turno
               
            FROM
                horario h
            INNER JOIN grupo g ON h.id_grupo = g.id_grupo
            INNER JOIN salon s ON h.id_salon = s.id_salon
            JOIN materia m ON h.id_materia = m.id_materia
            JOIN persona p ON h.id_persona = p.id_persona
            join turno t on g.id_turno = t.id_turno
          
            WHERE h.dia_horario = ? AND h.id_contenedor = ? AND h.id_escuela = ?;
`;


        const [results] = await conexion.query(queryText, [diaPrueba, idContenedor, id_escuela]);

        res.json(results);
    } catch (err) {
        console.error('Error fetching horarios:', err);
        res.status(500).json({ error: 'Error interno al obtener horarios.' });
    }
};
