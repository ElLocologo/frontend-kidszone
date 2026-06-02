import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import '../styles/AcademicSchedule.css';

const DAY_OPTIONS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
];

export default function AcademicScheduleAdmin({ token }) {
  const apiBase = import.meta.env.VITE_API_URL;
  const headers = { Authorization: `Bearer ${token}` };

  const [grades, setGrades] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [slots, setSlots] = useState([]);

  const [subjectForm, setSubjectForm] = useState({
    name: '',
    gradeId: '',
    teacherId: '',
    gradingScale: 'numeric',
    gradingNumericMin: '0',
    gradingNumericMax: '10',
    gradingLetterOptions: '',
    performanceCriteria: '',
  });

  const [editSubjectId, setEditSubjectId] = useState('');
  const [editSubjectForm, setEditSubjectForm] = useState({
    gradingScale: 'numeric',
    gradingNumericMin: '0',
    gradingNumericMax: '10',
    gradingLetterOptions: '',
    performanceCriteria: '',
  });

  const [slotGradeId, setSlotGradeId] = useState('');
  const [slotCourseId, setSlotCourseId] = useState('');
  const [slotForm, setSlotForm] = useState({
    subjectId: '',
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '09:00',
  });

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const showMsg = (text) => {
    setMsg(text);
    setErr('');
    setTimeout(() => setMsg(''), 4000);
  };

  const loadGrades = useCallback(async () => {
    const res = await axios.get(`${apiBase}/api/grades`, { headers });
    setGrades(res.data.grades || []);
  }, [apiBase, token]);

  const loadTeachers = useCallback(async () => {
    const res = await axios.get(`${apiBase}/api/admin/teachers`, { headers });
    const list = Array.isArray(res.data) ? res.data : [];
    setTeachers(list);
  }, [apiBase, token]);

  const loadSubjects = useCallback(async () => {
    const res = await axios.get(`${apiBase}/api/academic/subjects`, { headers });
    setSubjects(res.data.subjects || []);
  }, [apiBase, token]);

  const loadCoursesForGrade = useCallback(
    async (gradeId) => {
      if (!gradeId) {
        setCourses([]);
        return;
      }
      const res = await axios.get(`${apiBase}/api/courses`, {
        headers,
        params: { gradeId },
      });
      setCourses(res.data.courses || []);
    },
    [apiBase, token]
  );

  const loadSlotsForCourse = useCallback(
    async (courseId) => {
      if (!courseId) {
        setSlots([]);
        return;
      }
      const res = await axios.get(`${apiBase}/api/academic/slots/course/${courseId}`, {
        headers,
      });
      setSlots(res.data.slots || []);
    },
    [apiBase, token]
  );

  useEffect(() => {
    if (!token) return;
    loadGrades();
    loadTeachers();
    loadSubjects();
  }, [token, loadGrades, loadTeachers, loadSubjects]);

  useEffect(() => {
    loadCoursesForGrade(slotGradeId);
    setSlotCourseId('');
    setSlots([]);
    setSlotForm((f) => ({ ...f, subjectId: '' }));
  }, [slotGradeId, loadCoursesForGrade]);

  useEffect(() => {
    loadSlotsForCourse(slotCourseId);
  }, [slotCourseId, loadSlotsForCourse]);

  const subjectsForSlotGrade = subjects.filter((s) => s.gradeId === slotGradeId);

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await axios.post(
        `${apiBase}/api/academic/subjects`,
        {
          name: subjectForm.name.trim(),
          gradeId: subjectForm.gradeId,
          teacherId: subjectForm.teacherId,
          gradingScale: subjectForm.gradingScale,
          gradingNumericMin: Number(subjectForm.gradingNumericMin),
          gradingNumericMax: Number(subjectForm.gradingNumericMax),
          gradingLetterOptions: subjectForm.gradingLetterOptions || '',
          performanceCriteria: subjectForm.performanceCriteria || '',
        },
        { headers }
      );
      setSubjectForm({
        name: '',
        gradeId: '',
        teacherId: '',
        gradingScale: 'numeric',
        gradingNumericMin: '0',
        gradingNumericMax: '10',
        gradingLetterOptions: '',
        performanceCriteria: '',
      });
      await loadSubjects();
      showMsg('Materia registrada correctamente.');
    } catch (e2) {
      setErr(e2.response?.data?.error || e2.message);
    }
  };

  const startEditSubject = (s) => {
    setEditSubjectId(s.id);
    setEditSubjectForm({
      gradingScale: s.gradingScale || 'numeric',
      gradingNumericMin: String(s.gradingNumericMin ?? 0),
      gradingNumericMax: String(s.gradingNumericMax ?? 10),
      gradingLetterOptions: s.gradingLetterOptions || '',
      performanceCriteria: s.performanceCriteria || '',
    });
  };

  const handleUpdateSubjectCriteria = async (e) => {
    e.preventDefault();
    if (!editSubjectId) return;
    setErr('');
    try {
      await axios.patch(
        `${apiBase}/api/academic/subjects/${editSubjectId}`,
        {
          gradingScale: editSubjectForm.gradingScale,
          gradingNumericMin: Number(editSubjectForm.gradingNumericMin),
          gradingNumericMax: Number(editSubjectForm.gradingNumericMax),
          gradingLetterOptions: editSubjectForm.gradingLetterOptions,
          performanceCriteria: editSubjectForm.performanceCriteria,
        },
        { headers }
      );
      setEditSubjectId('');
      await loadSubjects();
      showMsg('Criterios de la materia actualizados.');
    } catch (e2) {
      setErr(e2.response?.data?.error || e2.message);
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('¿Eliminar esta materia?')) return;
    setErr('');
    try {
      await axios.delete(`${apiBase}/api/academic/subjects/${id}`, { headers });
      await loadSubjects();
      if (slotGradeId) await loadCoursesForGrade(slotGradeId);
      showMsg('Materia eliminada.');
    } catch (e2) {
      setErr(e2.response?.data?.error || e2.message);
    }
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    if (!slotCourseId || !slotForm.subjectId) {
      setErr('Selecciona curso y materia.');
      return;
    }
    setErr('');
    try {
      await axios.post(
        `${apiBase}/api/academic/slots`,
        {
          courseId: slotCourseId,
          subjectId: slotForm.subjectId,
          dayOfWeek: Number(slotForm.dayOfWeek),
          startTime: slotForm.startTime,
          endTime: slotForm.endTime,
        },
        { headers }
      );
      await loadSlotsForCourse(slotCourseId);
      showMsg('Franja agregada al horario.');
    } catch (e2) {
      setErr(e2.response?.data?.error || e2.message);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('¿Quitar esta franja del horario?')) return;
    setErr('');
    try {
      await axios.delete(`${apiBase}/api/academic/slots/${slotId}`, { headers });
      await loadSlotsForCourse(slotCourseId);
      showMsg('Franja eliminada.');
    } catch (e2) {
      setErr(e2.response?.data?.error || e2.message);
    }
  };

  const dayLabel = (d) => DAY_OPTIONS.find((x) => x.value === d)?.label || d;

  return (
    <div className="academic-admin">
      {msg && (
        <div style={{ padding: '10px 14px', background: '#d4edda', borderRadius: 8, color: '#155724' }}>
          {msg}
        </div>
      )}
      {err && (
        <div style={{ padding: '10px 14px', background: '#f8d7da', borderRadius: 8, color: '#721c24' }}>
          {err}
        </div>
      )}

      <section>
        <h3>Materias</h3>
        <p style={{ color: '#636e72', fontSize: '0.9rem', marginTop: 0 }}>
          Cada materia pertenece a un grado y tiene un docente asignado. Define cómo se califica (números, letras o
          texto) y el texto de desempeños o componentes que verán en el boletín.
        </p>
        <form className="form-grid" onSubmit={handleCreateSubject}>
          <div>
            <label htmlFor="subj-name">Nombre de la materia</label>
            <input
              id="subj-name"
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
              placeholder="Ej: Matemáticas"
              required
            />
          </div>
          <div>
            <label htmlFor="subj-grade">Grado</label>
            <select
              id="subj-grade"
              value={subjectForm.gradeId}
              onChange={(e) => setSubjectForm({ ...subjectForm, gradeId: e.target.value })}
              required
            >
              <option value="">— Elegir —</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="subj-teacher">Docente</label>
            <select
              id="subj-teacher"
              value={subjectForm.teacherId}
              onChange={(e) => setSubjectForm({ ...subjectForm, teacherId: e.target.value })}
              required
            >
              <option value="">— Elegir —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.nombre || t.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="subj-scale">Criterio de calificación</label>
            <select
              id="subj-scale"
              value={subjectForm.gradingScale}
              onChange={(e) => setSubjectForm({ ...subjectForm, gradingScale: e.target.value })}
            >
              <option value="numeric">Numérica (ej. 0–10)</option>
              <option value="letters">Letras (lista permitida)</option>
              <option value="descriptive">Descriptiva (texto libre)</option>
            </select>
          </div>
          {subjectForm.gradingScale === 'numeric' && (
            <>
              <div>
                <label htmlFor="subj-min">Mínimo</label>
                <input
                  id="subj-min"
                  type="number"
                  value={subjectForm.gradingNumericMin}
                  onChange={(e) =>
                    setSubjectForm({ ...subjectForm, gradingNumericMin: e.target.value })
                  }
                />
              </div>
              <div>
                <label htmlFor="subj-max">Máximo</label>
                <input
                  id="subj-max"
                  type="number"
                  value={subjectForm.gradingNumericMax}
                  onChange={(e) =>
                    setSubjectForm({ ...subjectForm, gradingNumericMax: e.target.value })
                  }
                />
              </div>
            </>
          )}
          {subjectForm.gradingScale === 'letters' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="subj-letters">Valores permitidos (separados por coma)</label>
              <input
                id="subj-letters"
                value={subjectForm.gradingLetterOptions}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, gradingLetterOptions: e.target.value })
                }
                placeholder="Ej: A, B, C, D"
              />
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="subj-perf">Desempeños / criterios (texto para boletín)</label>
            <textarea
              id="subj-perf"
              rows={3}
              value={subjectForm.performanceCriteria}
              onChange={(e) =>
                setSubjectForm({ ...subjectForm, performanceCriteria: e.target.value })
              }
              placeholder="Describe competencias o componentes aprobados que se mostrarán junto a la materia."
            />
          </div>
          <div>
            <button type="submit" className="btn-primary">
              Crear materia
            </button>
          </div>
        </form>

        {editSubjectId && (
          <form
            onSubmit={handleUpdateSubjectCriteria}
            style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#f1f3f5',
              borderRadius: 8,
            }}
          >
            <h4 style={{ margin: '0 0 0.75rem' }}>Editar criterios de materia seleccionada</h4>
            <div className="form-grid">
              <div>
                <label>Criterio</label>
                <select
                  value={editSubjectForm.gradingScale}
                  onChange={(e) =>
                    setEditSubjectForm({ ...editSubjectForm, gradingScale: e.target.value })
                  }
                >
                  <option value="numeric">Numérica</option>
                  <option value="letters">Letras</option>
                  <option value="descriptive">Descriptiva</option>
                </select>
              </div>
              {editSubjectForm.gradingScale === 'numeric' && (
                <>
                  <div>
                    <label>Mínimo</label>
                    <input
                      type="number"
                      value={editSubjectForm.gradingNumericMin}
                      onChange={(e) =>
                        setEditSubjectForm({
                          ...editSubjectForm,
                          gradingNumericMin: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label>Máximo</label>
                    <input
                      type="number"
                      value={editSubjectForm.gradingNumericMax}
                      onChange={(e) =>
                        setEditSubjectForm({
                          ...editSubjectForm,
                          gradingNumericMax: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}
              {editSubjectForm.gradingScale === 'letters' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Letras permitidas</label>
                  <input
                    value={editSubjectForm.gradingLetterOptions}
                    onChange={(e) =>
                      setEditSubjectForm({
                        ...editSubjectForm,
                        gradingLetterOptions: e.target.value,
                      })
                    }
                  />
                </div>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Desempeños / criterios</label>
                <textarea
                  rows={3}
                  value={editSubjectForm.performanceCriteria}
                  onChange={(e) =>
                    setEditSubjectForm({
                      ...editSubjectForm,
                      performanceCriteria: e.target.value,
                    })
                  }
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn-primary">
                  Guardar cambios
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => setEditSubjectId('')}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        )}

        <div style={{ marginTop: '1.25rem', overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Materia</th>
                <th>Grado</th>
                <th>Docente</th>
                <th>Criterio</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: '#636e72' }}>
                    No hay materias registradas este año.
                  </td>
                </tr>
              ) : (
                subjects.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.gradeName || '—'}</td>
                    <td>{s.teacherName || '—'}</td>
                    <td>
                      {s.gradingScale === 'letters'
                        ? `Letras (${s.gradingLetterOptions || '—'})`
                        : s.gradingScale === 'descriptive'
                          ? 'Descriptiva'
                          : `Numérica ${s.gradingNumericMin ?? 0}–${s.gradingNumericMax ?? 10}`}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ marginRight: 8, padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                        onClick={() => startEditSubject(s)}
                      >
                        Criterios
                      </button>
                      <button type="button" className="btn-danger" onClick={() => handleDeleteSubject(s.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3>Horario académico por curso</h3>
        <p style={{ color: '#636e72', fontSize: '0.9rem', marginTop: 0 }}>
          Elige el grado y el curso. Las materias disponibles son solo las del mismo grado. Cada franja es un día de la
          semana con hora de inicio y fin.
        </p>

        <div className="form-grid" style={{ marginBottom: '1rem' }}>
          <div>
            <label htmlFor="slot-grade">Grado</label>
            <select
              id="slot-grade"
              value={slotGradeId}
              onChange={(e) => setSlotGradeId(e.target.value)}
            >
              <option value="">— Elegir grado —</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="slot-course">Curso</label>
            <select
              id="slot-course"
              value={slotCourseId}
              onChange={(e) => setSlotCourseId(e.target.value)}
              disabled={!slotGradeId}
            >
              <option value="">— Elegir curso —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.section ? ` · Sección ${c.section}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {slotGradeId && subjectsForSlotGrade.length === 0 && (
          <p style={{ color: '#e17055' }}>
            No hay materias para este grado. Crea materias arriba primero.
          </p>
        )}

        <form className="form-grid" onSubmit={handleCreateSlot}>
          <div>
            <label htmlFor="slot-subj">Materia</label>
            <select
              id="slot-subj"
              value={slotForm.subjectId}
              onChange={(e) => setSlotForm({ ...slotForm, subjectId: e.target.value })}
              disabled={!slotCourseId || subjectsForSlotGrade.length === 0}
              required
            >
              <option value="">— Elegir —</option>
              {subjectsForSlotGrade.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.teacherName})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="slot-day">Día</label>
            <select
              id="slot-day"
              value={slotForm.dayOfWeek}
              onChange={(e) =>
                setSlotForm({ ...slotForm, dayOfWeek: Number(e.target.value) })
              }
            >
              {DAY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="slot-start">Inicio</label>
            <input
              id="slot-start"
              type="time"
              value={slotForm.startTime}
              onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="slot-end">Fin</label>
            <input
              id="slot-end"
              type="time"
              value={slotForm.endTime}
              onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
              required
            />
          </div>
          <div>
            <button
              type="submit"
              className="btn-primary"
              disabled={!slotCourseId}
            >
              Añadir franja
            </button>
          </div>
        </form>

        {slotCourseId && (
          <div style={{ marginTop: '1.25rem', overflowX: 'auto' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Franjas del curso seleccionado</h4>
            <table>
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Hora</th>
                  <th>Materia</th>
                  <th>Docente</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slots.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ color: '#636e72' }}>
                      Aún no hay franjas. Agrega la primera con el formulario.
                    </td>
                  </tr>
                ) : (
                  slots.map((sl) => (
                    <tr key={sl.id}>
                      <td>{dayLabel(sl.dayOfWeek)}</td>
                      <td>
                        {sl.startTime} – {sl.endTime}
                      </td>
                      <td>{sl.subjectName}</td>
                      <td>{sl.teacherName}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => handleDeleteSlot(sl.id)}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
