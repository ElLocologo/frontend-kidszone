import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import ScheduleManager from '../components/ScheduleManager';
import AcademicTimetableView from '../components/AcademicTimetableView';
import TeacherMarkbook from '../components/TeacherMarkbook';
import TeacherCourseReportCards from '../components/TeacherCourseReportCards';
import NotificationCenter from '../components/NotificationCenter';
import '../styles/TeacherDashboard.css';

export default function TeacherDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [myCourses, setMyCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance');
  const [apiError, setApiError] = useState('');
  const [absenceHistory, setAbsenceHistory] = useState([]);
  const [loadingAbsences, setLoadingAbsences] = useState(false);

  const token = localStorage.getItem('token');

  const formatAxiosError = (error, fallback) =>
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    const loadCourses = async () => {
      if (!token) return;
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/teacher/courses`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const courses = response.data.courses || [];
        setMyCourses(courses);
        setApiError('');
        if (courses.length === 1) {
          setSelectedCourseId(courses[0].id);
        }
      } catch (error) {
        console.error('Error cargando cursos del docente:', error);
        setApiError(
          formatAxiosError(error, 'No se pudieron cargar tus cursos.')
        );
      }
    };
    loadCourses();
  }, [token]);

  useEffect(() => {
    const loadStudentsForCourse = async () => {
      if (!selectedCourseId || !token) {
        setStudents([]);
        setAttendance({});
        return;
      }
      setLoadingRoster(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/students`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { courseId: selectedCourseId },
          }
        );
        const roster = response.data.students || [];
        setStudents(roster);
        setApiError('');
        const attendanceObj = {};
        roster.forEach((s) => {
          attendanceObj[s.id] = 'present';
        });
        setAttendance(attendanceObj);
      } catch (error) {
        console.error('Error cargando estudiantes del curso:', error);
        setStudents([]);
        setAttendance({});
        setApiError(
          formatAxiosError(
            error,
            'No se pudo cargar la lista de estudiantes del curso.'
          )
        );
      } finally {
        setLoadingRoster(false);
      }
    };
    loadStudentsForCourse();
  }, [selectedCourseId, token]);

  useEffect(() => {
    if (!selectedCourseId || !token) {
      setAbsenceHistory([]);
      return;
    }
    const loadAbsences = async () => {
      setLoadingAbsences(true);
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/attendance/course/${selectedCourseId}/absences`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAbsenceHistory(res.data.records || []);
      } catch (e) {
        console.error('Historial inasistencias:', e);
        setAbsenceHistory([]);
      } finally {
        setLoadingAbsences(false);
      }
    };
    loadAbsences();
  }, [selectedCourseId, token]);

  const handleAttendanceChange = (studentId, status) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const submitAttendance = async () => {
    if (!selectedCourseId) {
      alert('Selecciona un curso antes de guardar asistencia.');
      return;
    }
    if (!students.length) {
      alert('No hay estudiantes en este curso.');
      return;
    }

    setLoading(true);
    try {
      for (const studentId of Object.keys(attendance)) {
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/teacher/attendance`,
          {
            studentId,
            date: selectedDate,
            status: attendance[studentId],
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
      alert(
        'Listo. Solo se guardan inasistencias (ausente/retardo); los presentes no generan registro.'
      );
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/attendance/course/${selectedCourseId}/absences`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAbsenceHistory(res.data.records || []);
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const courseLabel = (course) =>
    `${course.name}${course.section ? ` · Sec ${course.section}` : ''}${
      course.gradeName ? ` (${course.gradeName})` : ''
    }`;

  return (
    <div className="teacher-dashboard">
      <nav className="navbar">
        <h1>KIDS ZONE - Docente</h1>
        <div className="navbar-actions">
          <NotificationCenter token={token} userId={user?.uid} />
          <button type="button" onClick={handleLogout}>🚪 Cerrar Sesión</button>
        </div>
      </nav>

      {apiError && (
        <div className="teacher-api-banner" role="alert">
          <span>{apiError}</span>
          <button
            type="button"
            className="teacher-api-banner-dismiss"
            onClick={() => setApiError('')}
            aria-label="Cerrar aviso"
          >
            ×
          </button>
        </div>
      )}

      <div className="teacher-tabs">
        <button
          type="button"
          className={activeTab === 'attendance' ? 'active' : ''}
          onClick={() => setActiveTab('attendance')}
        >
          ✅ Asistencia
        </button>
        <button
          type="button"
          className={activeTab === 'marks' ? 'active' : ''}
          onClick={() => setActiveTab('marks')}
        >
          📊 Calificaciones
        </button>
        <button
          type="button"
          className={activeTab === 'reports' ? 'active' : ''}
          onClick={() => setActiveTab('reports')}
        >
          📚 Mis Boletines
        </button>
        <button
          type="button"
          className={activeTab === 'timetable' ? 'active' : ''}
          onClick={() => setActiveTab('timetable')}
        >
          🕐 Horario escolar
        </button>
        <button
          type="button"
          className={activeTab === 'schedule' ? 'active' : ''}
          onClick={() => setActiveTab('schedule')}
        >
          📅 Agenda
        </button>
      </div>

      <div className="container">
        {activeTab === 'attendance' && (
          <div className="tab-section">
            <h2>✅ Tomar Asistencia</h2>

            <div className="teacher-controls-row">
              <div className="teacher-control-group">
                <label htmlFor="course">Curso</label>
                <select
                  id="course"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                >
                  <option value="">— Elige un curso —</option>
                  {myCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {courseLabel(course)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="teacher-control-group">
                <label htmlFor="date">Fecha</label>
                <input
                  type="date"
                  id="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            {!selectedCourseId && (
              <p className="teacher-hint">
                Elige el curso donde eres titular o docente de apoyo. Si no aparece ninguno,
                el administrador debe asignarte en la creación del curso.
              </p>
            )}

            {loadingRoster && selectedCourseId && (
              <p>Cargando lista del curso…</p>
            )}

            {!loadingRoster && selectedCourseId && students.length === 0 && (
              <p>No hay estudiantes activos matriculados en este curso.</p>
            )}

            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{`${student.name} ${student.lastName}`}</td>
                    <td>
                      <select
                        value={attendance[student.id] || 'present'}
                        onChange={(e) =>
                          handleAttendanceChange(student.id, e.target.value)
                        }
                      >
                        <option value="present">Presente</option>
                        <option value="absent">Ausente</option>
                        <option value="late">Retardo</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="teacher-hint">
              Por defecto todos aparecen como presentes. Cambia solo a los que
              faltaron o llegaron tarde: el sistema guarda únicamente esas
              excepciones.
            </p>

            <button
              type="button"
              onClick={submitAttendance}
              disabled={loading || !selectedCourseId || !students.length}
              className="submit-btn"
            >
              {loading ? 'Guardando...' : 'Guardar Asistencia'}
            </button>

            <div className="absence-history-block">
              <h3>Historial de inasistencias</h3>
              <p className="teacher-hint">
                Registros almacenados (ausencias y retardos) para este curso.
              </p>
              {!selectedCourseId && (
                <p className="teacher-hint">Selecciona un curso para ver el historial.</p>
              )}
              {loadingAbsences && selectedCourseId && (
                <p>Cargando historial…</p>
              )}
              {!loadingAbsences && selectedCourseId && (
                <div className="absence-history-table-wrap">
                  {absenceHistory.length === 0 ? (
                    <p>No hay inasistencias registradas en este curso.</p>
                  ) : (
                    <table className="absence-history-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Estudiante</th>
                          <th>Tipo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {absenceHistory.slice(0, 40).map((row) => (
                          <tr key={row.id}>
                            <td>
                              {row.date
                                ? new Date(row.date).toLocaleDateString('es-ES')
                                : '—'}
                            </td>
                            <td>{row.studentName || row.studentId}</td>
                            <td>
                              {row.status === 'late'
                                ? 'Retardo'
                                : row.status === 'excused'
                                  ? 'Justificado'
                                  : 'Ausente'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'marks' && (
          <div className="tab-section">
            <h2>Calificaciones por materia</h2>
            <p className="teacher-hint">
              Solo las materias que impartes en el grado del curso. Guarda borradores y luego envía al registro; para
              cambiar una nota ya enviada debes solicitar corrección al administrador.
            </p>
            <TeacherMarkbook token={token} />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="tab-section">
            <TeacherCourseReportCards token={token} />
          </div>
        )}

        {activeTab === 'timetable' && (
          <div className="tab-section">
            <AcademicTimetableView token={token} variant="teacher" />
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="tab-section">
            <ScheduleManager token={token} userRole="teacher" />
          </div>
        )}
      </div>
    </div>
  );
}
