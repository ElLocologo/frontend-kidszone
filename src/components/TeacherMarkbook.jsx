import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import '../styles/ReportCards.css';

const PERIODS = [
  { value: 'P1', label: 'Período 1' },
  { value: 'P2', label: 'Período 2' },
  { value: 'P3', label: 'Período 3' },
  { value: 'P4', label: 'Período 4' },
];

function parseLetters(s) {
  if (!s) return [];
  return String(s)
    .split(/[,;|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function TeacherMarkbook({ token }) {
  const apiBase = import.meta.env.VITE_API_URL;
  const headers = { Authorization: `Bearer ${token}` };

  const [courses, setCourses] = useState([]);
  const [mySubjects, setMySubjects] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [periodKey, setPeriodKey] = useState('P1');
  const [context, setContext] = useState(null);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [myRequests, setMyRequests] = useState([]);

  const [corrEntryId, setCorrEntryId] = useState('');
  const [corrReason, setCorrReason] = useState('');
  const [corrProposed, setCorrProposed] = useState('');

  const loadCourses = useCallback(async () => {
    const res = await axios.get(`${apiBase}/api/teacher/courses`, { headers });
    setCourses(res.data.courses || []);
  }, [apiBase, token]);

  const loadMySubjects = useCallback(async () => {
    const res = await axios.get(`${apiBase}/api/academic/subjects`, { headers });
    setMySubjects(res.data.subjects || []);
  }, [apiBase, token]);

  const loadRequests = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBase}/api/report-cards/teacher/correction-requests`, {
        headers,
      });
      setMyRequests(res.data.requests || []);
    } catch {
      setMyRequests([]);
    }
  }, [apiBase, token]);

  useEffect(() => {
    if (!token) return;
    loadCourses();
    loadMySubjects();
    loadRequests();
  }, [token, loadCourses, loadMySubjects, loadRequests]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === courseId),
    [courses, courseId]
  );

  const subjectsForCourse = useMemo(() => {
    if (!selectedCourse?.gradeId) return [];
    return mySubjects.filter((s) => s.gradeId === selectedCourse.gradeId);
  }, [mySubjects, selectedCourse]);

  const selectedSubject = useMemo(
    () => subjectsForCourse.find((s) => s.id === subjectId),
    [subjectsForCourse, subjectId]
  );

  useEffect(() => {
    if (!courseId || !subjectId || !periodKey || !token) {
      setContext(null);
      setValues({});
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await axios.get(`${apiBase}/api/report-cards/teacher/markbook`, {
          headers,
          params: { courseId, subjectId, periodKey },
        });
        if (cancelled) return;
        setContext(res.data);
        const v = {};
        (res.data.students || []).forEach((st) => {
          const e = res.data.entries?.[st.id];
          v[st.id] = e?.value ?? '';
        });
        setValues(v);
      } catch (e) {
        if (!cancelled) {
          setContext(null);
          setErr(e.response?.data?.error || e.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase, token, courseId, subjectId, periodKey]);

  const handleValueChange = (studentId, v) => {
    setValues((prev) => ({ ...prev, [studentId]: v }));
  };

  const saveDrafts = async () => {
    if (!context?.students?.length) return;
    setErr('');
    setMsg('');
    try {
      const grades = context.students.map((st) => ({
        studentId: st.id,
        value: values[st.id],
      }));
      const res = await axios.post(
        `${apiBase}/api/report-cards/teacher/markbook`,
        { courseId, subjectId, periodKey, grades },
        { headers }
      );
      const errors = res.data.errors || [];
      if (errors.length) {
        setErr(errors.map((x) => `${x.studentId}: ${x.error}`).join(' | '));
      }
      setMsg(`Guardado: ${res.data.saved || 0} borradores.`);
      const ctx = await axios.get(`${apiBase}/api/report-cards/teacher/markbook`, {
        headers,
        params: { courseId, subjectId, periodKey },
      });
      setContext(ctx.data);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  };

  const submitAll = async () => {
    if (!window.confirm('Al enviar, las calificaciones quedarán bloqueadas para tu edición. ¿Continuar?')) return;
    setErr('');
    setMsg('');
    try {
      const res = await axios.post(
        `${apiBase}/api/report-cards/teacher/markbook/submit`,
        { courseId, subjectId, periodKey },
        { headers }
      );
      setMsg(
        `Enviadas: ${res.data.submitted}. Omitidas: ${(res.data.skipped || []).length}. Revisa la consola de respuesta si hace falta.`
      );
      const ctx = await axios.get(`${apiBase}/api/report-cards/teacher/markbook`, {
        headers,
        params: { courseId, subjectId, periodKey },
      });
      setContext(ctx.data);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  };

  const openCorrection = (entryId, currentVal) => {
    setCorrEntryId(entryId);
    setCorrProposed(currentVal);
    setCorrReason('');
  };

  const sendCorrection = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await axios.post(
        `${apiBase}/api/report-cards/teacher/correction-requests`,
        {
          markbookEntryId: corrEntryId,
          reason: corrReason,
          proposedValue: corrProposed,
        },
        { headers }
      );
      setMsg('Solicitud enviada al administrador.');
      setCorrEntryId('');
      loadRequests();
    } catch (e2) {
      setErr(e2.response?.data?.error || e2.message);
    }
  };

  const renderInput = (st) => {
    const entry = context?.entries?.[st.id];
    const locked = entry?.status === 'submitted';
    const subj = context?.subject;

    if (locked) {
      return (
        <span>
          <strong>{entry.value}</strong>
          <button
            type="button"
            className="rc-link-btn"
            onClick={() => openCorrection(entry.id, entry.value)}
          >
            Solicitar corrección
          </button>
        </span>
      );
    }

    if (!subj) return null;

    if (subj.gradingScale === 'letters') {
      const opts = parseLetters(subj.gradingLetterOptions);
      return (
        <select
          value={values[st.id] || ''}
          onChange={(e) => handleValueChange(st.id, e.target.value)}
        >
          <option value="">—</option>
          {(opts.length ? opts : ['A', 'B', 'C', 'D', 'F']).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }

    if (subj.gradingScale === 'descriptive') {
      return (
        <textarea
          rows={2}
          value={values[st.id] || ''}
          onChange={(e) => handleValueChange(st.id, e.target.value)}
          placeholder="Desempeño"
        />
      );
    }

    return (
      <input
        type="number"
        step="0.1"
        min={subj.gradingNumericMin ?? 0}
        max={subj.gradingNumericMax ?? 10}
        value={values[st.id] ?? ''}
        onChange={(e) => handleValueChange(st.id, e.target.value)}
      />
    );
  };

  return (
    <div className="rc-wrap">
      {msg && <div className="rc-banner rc-banner-success">{msg}</div>}
      {err && <div className="rc-banner rc-banner-error">{err}</div>}

      <div className="rc-toolbar">
        <div>
          <label>Curso</label>
          <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setSubjectId(''); }}>
            <option value="">— Curso —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.section ? ` · ${c.section}` : ''} ({c.gradeName})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Materia (tu asignatura en este grado)</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={!courseId}
          >
            <option value="">— Materia —</option>
            {subjectsForCourse.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Período</label>
          <select value={periodKey} onChange={(e) => setPeriodKey(e.target.value)}>
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedSubject?.performanceCriteria && (
        <p className="rc-hint">
          <strong>Criterios de la materia (referencia):</strong> {selectedSubject.performanceCriteria}
        </p>
      )}

      {loading && <p>Cargando…</p>}

      {!loading && context?.students?.length === 0 && (
        <p className="rc-hint">No hay estudiantes activos en este curso.</p>
      )}

      {!loading && context?.students?.length > 0 && (
        <>
          <table className="rc-table">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Calificación</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {context.students.map((st) => {
                const e = context.entries?.[st.id];
                return (
                  <tr key={st.id}>
                    <td>
                      {st.name} {st.lastName}
                    </td>
                    <td>{renderInput(st)}</td>
                    <td>{e?.status === 'submitted' ? 'Enviada' : e?.status === 'draft' ? 'Borrador' : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="rc-actions">
            <button type="button" className="rc-btn rc-btn-secondary" onClick={saveDrafts}>
              Guardar borradores
            </button>
            <button type="button" className="rc-btn rc-btn-primary" onClick={submitAll}>
              Enviar calificaciones al registro
            </button>
          </div>
        </>
      )}

      {corrEntryId && (
        <form className="rc-modal" onSubmit={sendCorrection}>
          <h4>Solicitud de corrección al administrador</h4>
          <label>Motivo</label>
          <textarea
            required
            rows={3}
            value={corrReason}
            onChange={(e) => setCorrReason(e.target.value)}
          />
          <label>Valor corregido propuesto</label>
          <input
            required
            value={corrProposed}
            onChange={(e) => setCorrProposed(e.target.value)}
          />
          <div className="rc-actions">
            <button type="submit" className="rc-btn rc-btn-primary">
              Enviar solicitud
            </button>
            <button type="button" className="rc-btn rc-btn-secondary" onClick={() => setCorrEntryId('')}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <section className="rc-section">
        <h4>Mis solicitudes de corrección</h4>
        {myRequests.length === 0 ? (
          <p className="rc-hint">Ninguna.</p>
        ) : (
          <ul className="rc-list">
            {myRequests.slice(0, 15).map((r) => (
              <li key={r.id}>
                <strong>{r.periodKey}</strong> · {r.status}
                {r.adminComment ? ` — ${r.adminComment}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
