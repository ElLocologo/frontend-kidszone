import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import '../styles/ReportCards.css';

const PERIODS = [
  { value: 'P1', label: 'Período 1' },
  { value: 'P2', label: 'Período 2' },
  { value: 'P3', label: 'Período 3' },
  { value: 'P4', label: 'Período 4' },
];

export default function TeacherCourseReportCards({ token }) {
  const apiBase = import.meta.env.VITE_API_URL;
  const headers = { Authorization: `Bearer ${token}` };

  // Datos principales
  const [directorCourses, setDirectorCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('P1');
  const [reports, setReports] = useState([]);
  const [previewReport, setPreviewReport] = useState(null);

  // UI Estado
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  // Cargar cursos donde el maestro es director
  const loadDirectorCourses = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(
        `${apiBase}/api/report-cards/teacher/director-courses`,
        { headers }
      );
      const courses = res.data.courses || [];
      setDirectorCourses(courses);
      setErr('');
      if (courses.length > 0 && !selectedCourse) {
        setSelectedCourse(courses[0].id);
      }
    } catch (e) {
      console.error('Error cargando cursos de director:', e);
      setErr(e.response?.data?.error || e.message);
      setDirectorCourses([]);
    }
  }, [apiBase, token, selectedCourse]);

  // Cargar boletines del curso seleccionado
  const loadCourseReports = useCallback(async () => {
    if (!selectedCourse || !token) {
      setReports([]);
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get(
        `${apiBase}/api/report-cards/teacher/course/${selectedCourse}/reports`,
        {
          headers,
          params: { periodKey: selectedPeriod },
        }
      );
      setReports(res.data.reports || []);
      setErr('');
    } catch (e) {
      console.error('Error cargando boletines del curso:', e);
      setErr(e.response?.data?.error || e.message);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, selectedCourse, selectedPeriod]);

  // Cargar datos iniciales
  useEffect(() => {
    if (!token) return;
    loadDirectorCourses();
  }, [token, loadDirectorCourses]);

  // Cargar reportes cuando cambia el curso o período
  useEffect(() => {
    if (!selectedCourse) return;
    loadCourseReports();
  }, [selectedCourse, selectedPeriod, loadCourseReports]);

  // Auxiliares
  const getPeriodLabel = (periodKey) =>
    PERIODS.find((p) => p.value === periodKey)?.label || periodKey;

  const selectedCourseData = useMemo(
    () => directorCourses.find((c) => c.id === selectedCourse),
    [directorCourses, selectedCourse]
  );

  // Filtrar boletines por estado
  const publishedReports = useMemo(
    () => reports.filter((r) => r.published),
    [reports]
  );

  const sentReports = useMemo(
    () => reports.filter((r) => r.sentToParents),
    [reports]
  );

  const draftReports = useMemo(
    () => reports.filter((r) => !r.published),
    [reports]
  );

  return (
    <div className="rc-wrap">
      {msg && <div className="rc-banner rc-banner-success">✓ {msg}</div>}
      {err && <div className="rc-banner rc-banner-error">✗ {err}</div>}

      {directorCourses.length === 0 ? (
        <section className="rc-section" style={{ borderTop: 'none', paddingTop: 0 }}>
          <h3 style={{ marginTop: 0 }}>📚 Mis Boletines (Cursos a mi cargo)</h3>
          <p className="rc-hint">
            ℹ️ No eres director de ningún curso aún. Como maestro regular, podrás ingresar las
            calificaciones de los estudiantes en tus materias. Solo los directores de curso
            pueden ver los boletines consolidados de su grupo.
          </p>
        </section>
      ) : (
        <>
          {/* Selector de curso */}
          <section className="rc-section" style={{ borderTop: 'none', paddingTop: 0 }}>
            <h3 style={{ marginTop: 0 }}>📚 Mis Boletines (Cursos a mi cargo)</h3>
            <p className="rc-hint">
              Como director de {directorCourses.length} curso(s), puedes ver los boletines
              consolidados de los estudiantes a tu cargo.
            </p>

            <div className="rc-filters-panel">
              <div className="rc-filters-title">Selecciona un curso y período</div>
              <div className="rc-filters-grid">
                <div className="rc-filter-item">
                  <label>Mi Curso</label>
                  <select
                    value={selectedCourse || ''}
                    onChange={(e) => {
                      setSelectedCourse(e.target.value);
                      setSelectedPeriod('P1');
                    }}
                  >
                    {directorCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.gradeName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rc-filter-item">
                  <label>Período</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                  >
                    {PERIODS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rc-filter-item">
                  <label>&nbsp;</label>
                  <div style={{ color: '#666', fontSize: '0.9rem', lineHeight: '2.5' }}>
                    Estudiantes: {selectedCourseData?.enrolledCount || 0}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Información de boletines */}
          <section className="rc-section">
            <h3>📊 Estado de Boletines</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  borderLeft: '4px solid #2196F3',
                }}
              >
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2196F3' }}>
                  {reports.length}
                </div>
                <div style={{ color: '#666' }}>Boletines Generados</div>
              </div>
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  borderLeft: '4px solid #4CAF50',
                }}
              >
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4CAF50' }}>
                  {publishedReports.length}
                </div>
                <div style={{ color: '#666' }}>Publicados</div>
              </div>
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  borderLeft: '4px solid #FF9800',
                }}
              >
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF9800' }}>
                  {sentReports.length}
                </div>
                <div style={{ color: '#666' }}>Enviados a Padres</div>
              </div>
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  borderLeft: '4px solid #f44',
                }}
              >
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f44' }}>
                  {draftReports.length}
                </div>
                <div style={{ color: '#666' }}>Borradores</div>
              </div>
            </div>

            {/* Lista de boletines */}
            <h4>Boletines del Período {getPeriodLabel(selectedPeriod)}</h4>
            {loading ? (
              <p className="rc-hint">Cargando boletines...</p>
            ) : reports.length === 0 ? (
              <p className="rc-hint">
                No hay boletines generados para este período. El administrador debe generarlos
                primero con las notas que los docentes han enviado.
              </p>
            ) : (
              <div className="rc-table-wrapper">
                <table className="rc-table">
                  <thead>
                    <tr>
                      <th>Estudiante</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id}>
                        <td>
                          <strong>{report.studentName}</strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {!report.published && (
                              <span className="rc-badge rc-badge-draft">▪ Borrador</span>
                            )}
                            {report.published && (
                              <span className="rc-badge rc-badge-published">✓ Publicado</span>
                            )}
                            {report.sentToParents && (
                              <span className="rc-badge" style={{ backgroundColor: '#4CAF50' }}>
                                ✉️ Enviado
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="rc-btn rc-btn-small rc-btn-secondary"
                            onClick={() => setPreviewReport(report)}
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* VISTA PREVIA DE BOLETÍN */}
      {previewReport && previewReport.items && (
        <section className="rc-section">
          <h3>👁️ Vista Previa del Boletín</h3>

          <div className="rc-preview-header">
            <div>
              <h4>{previewReport.studentName}</h4>
              <p>
                <strong>Grado:</strong> Grado X | <strong>Curso:</strong> {selectedCourseData?.name}
              </p>
              <p>
                <strong>Período:</strong> {getPeriodLabel(previewReport.periodKey)}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              {previewReport.published ? (
                <span className="rc-badge rc-badge-published">✓ Publicado</span>
              ) : (
                <span className="rc-badge rc-badge-draft">▪ Borrador</span>
              )}
              {previewReport.sentToParents && (
                <span className="rc-badge" style={{ backgroundColor: '#4CAF50', marginLeft: '0.5rem' }}>
                  ✉️ Enviado a Padres
                </span>
              )}
            </div>
          </div>

          <div className="rc-preview-items">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Materia</th>
                  <th>Docente</th>
                  <th>Calificación</th>
                </tr>
              </thead>
              <tbody>
                {previewReport.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.subjectName}</td>
                    <td>{item.teacherName}</td>
                    <td style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rc-preview-actions">
            <button
              type="button"
              className="rc-btn rc-btn-secondary"
              onClick={() => setPreviewReport(null)}
            >
              Cerrar Vista Previa
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
