import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import '../styles/AcademicSchedule.css';

const DAY_NAMES = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
};

function groupByDay(slots) {
  const map = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  (slots || []).forEach((s) => {
    const d = s.dayOfWeek;
    if (map[d]) map[d].push(s);
  });
  [1, 2, 3, 4, 5].forEach((d) => {
    map[d].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  });
  return map;
}

export default function AcademicTimetableView({
  token,
  variant,
  studentId,
}) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState(null);

  const apiBase = import.meta.env.VITE_API_URL;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (variant === 'parent' && !studentId) {
        setSlots([]);
        setMeta(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        let url = `${apiBase}/api/academic/timetable/teacher`;
        if (variant === 'parent') {
          url = `${apiBase}/api/academic/timetable/parent/${studentId}`;
        }
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        setSlots(res.data.slots || []);
        setMeta(
          variant === 'parent'
            ? {
                courseName: res.data.courseName,
                courseId: res.data.courseId,
                message: res.data.message,
              }
            : null
        );
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.error || e.message || 'Error al cargar');
          setSlots([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token, variant, studentId, apiBase]);

  const byDay = useMemo(() => groupByDay(slots), [slots]);

  const title =
    variant === 'teacher'
      ? 'Mi horario de clases'
      : 'Horario del curso';

  const subtitle =
    variant === 'teacher'
      ? 'Materias y franjas asignadas según el horario escolar configurado por administración.'
      : 'Clases del curso en el que está matriculado el estudiante seleccionado.';

  if (loading) {
    return (
      <div className="academic-timetable">
        <p className="hint">Cargando horario…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="academic-timetable">
        <p className="hint" style={{ color: '#d63031' }}>
          {error}
        </p>
      </div>
    );
  }

  if (variant === 'parent' && meta?.message) {
    return (
      <div className="academic-timetable">
        <h3>{title}</h3>
        <p className="hint">{meta.message}</p>
      </div>
    );
  }

  return (
    <div className="academic-timetable">
      <h3>{title}</h3>
      <p className="hint">{subtitle}</p>
      {variant === 'parent' && meta?.courseName && (
        <p className="hint">
          <strong>Curso:</strong> {meta.courseName}
        </p>
      )}

      {slots.length === 0 ? (
        <p className="empty-msg">
          No hay franjas en el horario académico para este período.
        </p>
      ) : (
        [1, 2, 3, 4, 5].map((d) => {
          const rows = byDay[d];
          if (!rows.length) return null;
          return (
            <div key={d} className="day-block">
              <div className="day-title">{DAY_NAMES[d]}</div>
              <table>
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Materia</th>
                    {variant === 'teacher' && <th>Curso</th>}
                    {variant === 'parent' && <th>Docente</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {row.startTime} – {row.endTime}
                      </td>
                      <td>{row.subjectName}</td>
                      {variant === 'teacher' && (
                        <td>
                          {row.courseName}
                          {row.gradeName ? ` · ${row.gradeName}` : ''}
                        </td>
                      )}
                      {variant === 'parent' && <td>{row.teacherName || '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
}
