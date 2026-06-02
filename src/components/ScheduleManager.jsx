import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import '../styles/Schedule.css';

function scopeLabel(scope) {
  if (scope === 'course') return 'Curso';
  if (scope === 'personal') return 'Personal';
  return 'Institucional';
}

export default function ScheduleManager({
  token,
  userRole: userRoleProp,
  userId,
}) {
  const stored = useMemo(
    () => JSON.parse(localStorage.getItem('user') || '{}'),
    []
  );
  const userRole = userRoleProp || stored.role || 'parent';

  const [schedules, setSchedules] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [teacherCourses, setTeacherCourses] = useState([]);
  const [grades, setGrades] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [allParents, setAllParents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [expandedDays, setExpandedDays] = useState(new Set());
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'event',
    notes: '',
    courseId: '',
    scope: 'institutional',
    gradeIds: [],
    userIds: [],
    notificationOnly: false,
  });

  useEffect(() => {
    loadSchedules();
  }, [currentMonth, token]);

  useEffect(() => {
    if (userRole !== 'admin') return;
    const loadAdminData = async () => {
      try {
        const [gradesRes, coursesRes, teachersRes, parentsRes, studentsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/grades`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/courses`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/admin/teachers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/admin/parents`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/admin/students`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setGrades(gradesRes.data.grades || []);
        setAllCourses(coursesRes.data.courses || []);
        setAllTeachers(Array.isArray(teachersRes.data) ? teachersRes.data : []);
        setAllParents(Array.isArray(parentsRes.data) ? parentsRes.data : []);
        setAllStudents(studentsRes.data);
      } catch (e) {
        console.error('Error cargando datos admin:', e);
      }
    };
    if (token) loadAdminData();
  }, [userRole, token]);

  useEffect(() => {
    if (userRole !== 'teacher' || !token) return;
    const loadCourses = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/teacher/courses`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const courses = response.data.courses || [];
        setTeacherCourses(courses);
        if (courses.length && !formData.courseId) {
          setFormData((prev) => ({ ...prev, courseId: courses[0].id }));
        }
      } catch (e) {
        console.error('Error cargando cursos:', e);
      }
    };
    loadCourses();
  }, [userRole, token]);

  const loadSchedules = async () => {
    try {
      const month = currentMonth.getMonth() + 1;
      const year = currentMonth.getFullYear();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/services/schedules/month?month=${month}&year=${year}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSchedules(response.data);
    } catch (error) {
      console.error('Error cargando horarios:', error);
    }
  };

  const scopeHint = () => {
    if (userRole === 'admin') {
      if (formData.notificationOnly) return 'Notificación para el alcance seleccionado. No se creará evento en la agenda.';
      switch (formData.scope) {
        case 'institutional': return 'Visible para todos los docentes y padres.';
        case 'teachers': return 'Solo visible para docentes.';
        case 'parents': return 'Solo visible para padres.';
        case 'course': return 'Solo visible para padres de alumnos en el curso elegido.';
        case 'grades': return 'Visible para padres de alumnos en los grados seleccionados.';
        case 'specificUsers': return 'Visible solo para las personas seleccionadas.';
        default: return 'Alcance institucional: visible para todos los docentes y padres.';
      }
    }
    if (userRole === 'teacher') {
      return 'Alcance del curso: solo los padres con hijos matriculados en el curso elegido.';
    }
    return 'Recordatorio personal: solo tú puedes ver este evento.';
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (userRole === 'teacher' && !formData.courseId) {
      alert('Selecciona el curso.');
      return;
    }
    if (!formData.notificationOnly && (!formData.date || !formData.startTime || !formData.endTime)) {
      alert('Completa la fecha y horarios, o marca "Solo notificación".');
      return;
    }
    
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        notes: formData.notes,
        notificationOnly: formData.notificationOnly,
      };

      if (!formData.notificationOnly) {
        payload.date = formData.date;
        payload.startTime = formData.startTime;
        payload.endTime = formData.endTime;
      }

      if (userRole === 'teacher') {
        payload.courseId = formData.courseId;
        payload.scope = 'course';
      } else if (userRole === 'admin') {
        payload.scope = formData.scope;
        if (formData.scope === 'course' && formData.courseId) {
          payload.courseId = formData.courseId;
        }
        if (formData.scope === 'grades') {
          payload.gradeIds = formData.gradeIds;
        }
        if (formData.scope === 'specificUsers') {
          payload.userIds = formData.userIds;
        }
      }

      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/services/schedules`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      setFormData({
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        type: 'event',
        notes: '',
        courseId: teacherCourses[0]?.id || '',
        scope: 'institutional',
        gradeIds: [],
        userIds: [],
        notificationOnly: false,
      });
      setShowForm(false);
      loadSchedules();
      alert('✅ ' + (formData.notificationOnly ? 'Notificación enviada' : 'Evento creado') + ' correctamente');
    } catch (error) {
      alert('❌ Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getSchedulesForDate = (day) => {
    return schedules.filter((schedule) => {
      const d = new Date(schedule.date);
      return (
        d.getDate() === day && d.getMonth() === currentMonth.getMonth()
      );
    });
  };

  const monthDays = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: monthDays }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => null);

  const typeIcons = {
    class: '📚',
    event: '🎉',
    activity: '🎨',
  };

  return (
    <div className="schedule-manager">
      <div className="schedule-header">
        <h3>📅 Agenda</h3>
        <button
          className="btn-add-schedule"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancelar' : '➕ Nuevo Evento'}
        </button>
      </div>

      <p className="schedule-scope-hint">{scopeHint()}</p>

      {showForm && (
        <form className="schedule-form" onSubmit={handleAddSchedule}>
          {userRole === 'teacher' && (
            <div className="form-group">
              <label>Curso *</label>
              <select
                value={formData.courseId}
                onChange={(e) =>
                  setFormData({ ...formData, courseId: e.target.value })
                }
                required
              >
                <option value="">— Selecciona curso —</option>
                {teacherCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.section ? ` · ${c.section}` : ''}
                    {c.gradeName ? ` (${c.gradeName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {userRole === 'admin' && (
            <div className="form-group">
              <label>Alcance del evento/notificación *</label>
              <select
                value={formData.scope}
                onChange={(e) =>
                  setFormData({ ...formData, scope: e.target.value, gradeIds: [], userIds: [], courseId: '' })
                }
              >
                <option value="institutional">Todos (Institucional)</option>
                <option value="teachers">Solo Docentes</option>
                <option value="parents">Solo Padres</option>
                <option value="course">Curso Específico</option>
                <option value="grades">Grado(s)</option>
                <option value="specificUsers">Persona(s) Específica(s)</option>
              </select>
            </div>
          )}

          {userRole === 'admin' && formData.scope === 'course' && (
            <div className="form-group">
              <label>Selecciona el Curso</label>
              <select
                value={formData.courseId}
                onChange={(e) =>
                  setFormData({ ...formData, courseId: e.target.value })
                }
              >
                <option value="">— Selecciona curso —</option>
                {allCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.section ? ` · ${c.section}` : ''}
                    {c.gradeName ? ` (${c.gradeName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {userRole === 'admin' && formData.scope === 'grades' && (
            <div className="form-group">
              <label>Selecciona Grado(s)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {grades.map((g) => (
                  <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input
                      type="checkbox"
                      checked={formData.gradeIds.includes(g.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            gradeIds: [...formData.gradeIds, g.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            gradeIds: formData.gradeIds.filter((id) => id !== g.id),
                          });
                        }
                      }}
                    />
                    {g.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {userRole === 'admin' && formData.scope === 'specificUsers' && (
            <div className="form-group">
              <label>Selecciona Persona(s)</label>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Docentes:</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {allTeachers.map((t) => (
                      <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="checkbox"
                          checked={formData.userIds.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                userIds: [...formData.userIds, t.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                userIds: formData.userIds.filter((id) => id !== t.id),
                              });
                            }
                          }}
                        />
                        {t.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <strong>Padres:</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {allParents.map((p) => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="checkbox"
                          checked={formData.userIds.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                userIds: [...formData.userIds, p.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                userIds: formData.userIds.filter((id) => id !== p.id),
                              });
                            }
                          }}
                        />
                        {p.name} ({p.email})
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Título del Evento/Notificación *</label>
            <input
              type="text"
              placeholder={
                userRole === 'parent'
                  ? 'Ej: Traer carpeta roja'
                  : 'Ej: Reunión de padres'
              }
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Tipo *</label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
            >
              <option value="event">Evento</option>
              <option value="class">Clase</option>
              <option value="activity">Actividad</option>
            </select>
          </div>

          {!formData.notificationOnly && (
            <>
              <div className="form-group">
                <label>Fecha *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required={!formData.notificationOnly}
                />
              </div>
              <div className="form-group">
                <label>Hora Inicio *</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  required={!formData.notificationOnly}
                />
              </div>
              <div className="form-group">
                <label>Hora Fin *</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  required={!formData.notificationOnly}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              placeholder="Detalles adicionales..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          {userRole === 'admin' && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={formData.notificationOnly}
                  onChange={(e) =>
                    setFormData({ ...formData, notificationOnly: e.target.checked })
                  }
                />
                <span>Solo enviar notificación (sin crear evento en agenda)</span>
              </label>
            </div>
          )}

          <button type="submit" className="btn-submit">
            {formData.notificationOnly ? '📤 Enviar Notificación' : '✅ Crear Evento'}
          </button>
        </form>
      )}

      <div className="calendar">
        <div className="calendar-nav">
          <button
            type="button"
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() - 1
                )
              )
            }
          >
            ◀ Anterior
          </button>
          <h4>
            {currentMonth.toLocaleDateString('es-ES', {
              month: 'long',
              year: 'numeric',
            })}
          </h4>
          <button
            type="button"
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() + 1
                )
              )
            }
          >
            Siguiente ▶
          </button>
        </div>

        <div className="weekdays">
          <div>Lun</div>
          <div>Mar</div>
          <div>Mié</div>
          <div>Jue</div>
          <div>Vie</div>
          <div>Sáb</div>
          <div>Dom</div>
        </div>

        <div className="calendar-grid">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day empty"></div>
          ))}
          {days.map((day) => {
            const daySchedules = getSchedulesForDate(day);
            const dayKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${day}`;
            const isExpanded = expandedDays.has(dayKey);
            const maxEventsShown = 3;
            const visibleSchedules = isExpanded ? daySchedules : daySchedules.slice(0, maxEventsShown);
            const hasMoreEvents = daySchedules.length > maxEventsShown;
            
            return (
              <div key={day} className="calendar-day">
                <div className="day-number">{day}</div>
                <div className="day-events">
                  {visibleSchedules.map((schedule) => (
                    <div key={schedule.id} className="event-badge" title={schedule.title}>
                      <span>{typeIcons[schedule.type]}</span>
                      <small>{schedule.title.substring(0, 12)}</small>
                      <span className="event-scope-tag">
                        {scopeLabel(schedule.scope)}
                      </span>
                    </div>
                  ))}
                  {hasMoreEvents && !isExpanded && (
                    <div 
                      className="event-badge event-more-indicator"
                      onClick={() => setExpandedDays(new Set(expandedDays).add(dayKey))}
                      style={{ cursor: 'pointer', fontWeight: 'bold', color: '#FF6F00' }}
                    >
                      <span>➕</span>
                      <small>{daySchedules.length - maxEventsShown} más...</small>
                    </div>
                  )}
                  {hasMoreEvents && isExpanded && (
                    <div 
                      className="event-badge event-more-indicator"
                      onClick={() => {
                        const newSet = new Set(expandedDays);
                        newSet.delete(dayKey);
                        setExpandedDays(newSet);
                      }}
                      style={{ cursor: 'pointer', fontWeight: 'bold', color: '#2196F3' }}
                    >
                      <span>➖</span>
                      <small>Ver menos</small>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="schedule-list">
        <h4>📋 Próximos Eventos</h4>
        {schedules.length > 0 ? (
          <ul>
            {schedules.slice(0, 8).map((schedule) => (
              <li key={schedule.id}>
                <span className="event-icon">{typeIcons[schedule.type]}</span>
                <div className="event-info">
                  <strong>{schedule.title}</strong>
                  <p className="event-meta-line">
                    {new Date(schedule.date).toLocaleDateString('es-ES')} |{' '}
                    {schedule.startTime} - {schedule.endTime}{' '}
                    <span className="event-scope-pill">
                      {scopeLabel(schedule.scope)}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No hay eventos en este mes</p>
        )}
      </div>
    </div>
  );
}
