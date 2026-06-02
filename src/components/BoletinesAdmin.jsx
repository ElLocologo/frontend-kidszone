import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import '../styles/ReportCards.css';

const PERIODS = [
  { value: 'P1', label: 'Período 1' },
  { value: 'P2', label: 'Período 2' },
  { value: 'P3', label: 'Período 3' },
  { value: 'P4', label: 'Período 4' },
];

export default function BoletinesAdmin({ token }) {
  const apiBase = import.meta.env.VITE_API_URL;
  const headers = { Authorization: `Bearer ${token}` };

  // Datos principales
  const [grades, setGrades] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [requests, setRequests] = useState([]);
  
  // Filtros de búsqueda avanzada
  const [searchCourse, setSearchCourse] = useState('');
  const [searchCedula, setSearchCedula] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchPeriod, setSearchPeriod] = useState('');
  const [searchYear, setSearchYear] = useState(new Date().getFullYear().toString());

  // Estado de generación
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('P1');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [lastReport, setLastReport] = useState(null);
  const [previewReport, setPreviewReport] = useState(null);

  // Estado de resolución de correcciones
  const [resolveId, setResolveId] = useState(null);
  const [approve, setApprove] = useState(true);
  const [adminComment, setAdminComment] = useState('');
  const [appliedValue, setAppliedValue] = useState('');

  // Estado de envío a padres
  const [sendingReportId, setSendingReportId] = useState(null);

  // Mensajes
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  // Cargar grados
  const loadGrades = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBase}/api/grades`, { headers });
      setGrades(Array.isArray(res.data) ? res.data : res.data.grades || []);
    } catch (e) {
      console.error('Error cargando grados:', e);
    }
  }, [apiBase, token]);

  // Cargar cursos
  const loadCourses = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBase}/api/courses`, { headers });
      setCourses(Array.isArray(res.data) ? res.data : res.data.courses || []);
    } catch (e) {
      console.error('Error cargando cursos:', e);
    }
  }, [apiBase, token]);

  // Cargar estudiantes
  const loadStudents = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBase}/api/admin/students`, { headers });
      const list = Array.isArray(res.data) ? res.data : res.data.students || [];
      setStudents(list.filter((s) => s.enrollment?.status === 'active'));
    } catch (e) {
      console.error('Error cargando estudiantes:', e);
    }
  }, [apiBase, token]);

  // Cargar boletines con búsqueda avanzada
  const loadReports = useCallback(async (queryParams = {}) => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiBase}/api/report-cards/admin/reports/search`, {
        headers,
        params: {
          courseId: searchCourse,
          studentCedula: searchCedula,
          studentName: searchName,
          periodKey: searchPeriod,
          year: searchYear,
          ...queryParams,
        },
      });
      setAllReports(Array.isArray(res.data) ? res.data : res.data.reports || []);
      setErr('');
    } catch (e) {
      console.error('Error cargando boletines:', e);
      setAllReports([]);
      if (e.response?.status !== 404) {
        setErr(e.response?.data?.error || e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, searchCourse, searchCedula, searchName, searchPeriod, searchYear]);

  // Cargar solicitudes
  const loadRequests = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBase}/api/report-cards/admin/correction-requests`, {
        headers,
        params: { status: 'pending' },
      });
      setRequests(res.data.requests || []);
    } catch (e) {
      console.error('Error cargando solicitudes:', e);
    }
  }, [apiBase, token]);

  // Cargar datos iniciales
  useEffect(() => {
    if (!token) return;
    loadGrades();
    loadCourses();
    loadStudents();
    loadRequests();
    loadReports();
  }, [token, loadGrades, loadCourses, loadStudents, loadRequests]);

  // Cargar boletines cuando cambian filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      loadReports();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchCourse, searchCedula, searchName, searchPeriod, searchYear, loadReports]);

  // Auxiliares
  const studentNameById = useMemo(
    () => Object.fromEntries(
      students.map((s) => [s.id, `${s.name || ''} ${s.lastName || ''}`.trim()])
    ),
    [students]
  );

  const studentCedulaById = useMemo(
    () => Object.fromEntries(
      students.map((s) => [s.id, s.cedula || '—'])
    ),
    [students]
  );

  // Cursos filtrados por grado
  const filteredCourses = useMemo(
    () => courses,
    [courses]
  );

  // Estudiantes para generación de boletines (solo activos)
  const filteredStudents = useMemo(
    () => students.filter((s) => s.enrollment?.status === 'active'),
    [students]
  );

  const getGradeName = (gradeId) => grades.find((g) => g.id === gradeId)?.name || gradeId;
  const getCourseName = (courseId) => courses.find((c) => c.id === courseId)?.name || courseId;
  const getPeriodLabel = (periodKey) => PERIODS.find((p) => p.value === periodKey)?.label || periodKey;

  // Resolver corrección de notas
  const handleResolveCorrection = async (e) => {
    e.preventDefault();
    if (!resolveId) return;
    setErr('');
    try {
      await axios.post(
        `${apiBase}/api/report-cards/admin/correction-requests/${resolveId}/resolve`,
        {
          approve,
          adminComment,
          appliedValue: approve ? appliedValue : undefined,
        },
        { headers }
      );
      setMsg(approve ? 'Solicitud aprobada.' : 'Solicitud rechazada.');
      setResolveId(null);
      loadRequests();
      loadReports();
    } catch (e2) {
      setErr(e2.response?.data?.error || e2.message);
    }
  };

  // Generar boletín
  const handleGenerateReport = async () => {
    if (!selectedStudentId) {
      setErr('Selecciona un estudiante.');
      return;
    }
    setErr('');
    setMsg('');
    try {
      const res = await axios.post(
        `${apiBase}/api/report-cards/admin/reports/generate`,
        { studentId: selectedStudentId, periodKey: selectedPeriod, academicYear: selectedYear },
        { headers }
      );
      setLastReport(res.data.report);
      setPreviewReport(res.data.report);
      setMsg('Boletín generado. Revísalo y puedes publicarlo.');
      loadReports();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  };

  // Publicar boletín
  const handlePublishReport = async (reportId) => {
    setErr('');
    setMsg('');
    try {
      await axios.post(
        `${apiBase}/api/report-cards/admin/reports/${reportId}/publish`,
        {},
        { headers }
      );
      setMsg('Boletín publicado. Ya está visible para padres de familia.');
      if (previewReport?.id === reportId) {
        setPreviewReport((prev) => (prev ? { ...prev, published: true } : prev));
      }
      loadReports();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  };

  // Enviar boletín a padres
  const handleSendToParents = async (reportId) => {
    setErr('');
    setMsg('');
    setSendingReportId(reportId);
    try {
      await axios.post(
        `${apiBase}/api/report-cards/admin/reports/${reportId}/send-to-parents`,
        {},
        { headers }
      );
      setMsg('Boletín enviado a padres. Se ha generado una notificación.');
      if (previewReport?.id === reportId) {
        setPreviewReport((prev) => (prev ? { ...prev, sentToParents: true } : prev));
      }
      loadReports();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSendingReportId(null);
    }
  };

  // Limpiar búsqueda
  const clearSearch = () => {
    setSearchCourse('');
    setSearchCedula('');
    setSearchName('');
    setSearchPeriod('');
  };

  return (
    <div className="rc-wrap">
      {msg && <div className="rc-banner rc-banner-success">✓ {msg}</div>}
      {err && <div className="rc-banner rc-banner-error">✗ {err}</div>}

      {/* SOLICITUDES DE CORRECCIÓN */}
      <section className="rc-section" style={{ borderTop: 'none', paddingTop: 0 }}>
        <h3 style={{ marginTop: 0 }}>📋 Solicitudes de Corrección de Notas</h3>
        {requests.length === 0 ? (
          <p className="rc-hint">✓ No hay solicitudes pendientes.</p>
        ) : (
          <div className="rc-table-wrapper">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Docente (ID)</th>
                  <th>Estudiante</th>
                  <th>Período</th>
                  <th style={{ maxWidth: 150 }}>Motivo</th>
                  <th>Valor Propuesto</th>
                  <th style={{ textAlign: 'center', width: 80 }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 5).map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontSize: '0.85rem' }}>{r.teacherId?.slice(0, 10)}…</td>
                    <td>{studentNameById[r.studentId] || '?'}</td>
                    <td>{getPeriodLabel(r.periodKey)}</td>
                    <td style={{ maxWidth: 150, fontSize: '0.85rem', color: '#666' }}>
                      {r.reason}
                    </td>
                    <td>
                      <strong>{r.proposedValue}</strong>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="rc-btn rc-btn-primary"
                        onClick={() => {
                          setResolveId(r.id);
                          setApprove(true);
                          setAppliedValue(r.proposedValue || '');
                          setAdminComment('');
                        }}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                      >
                        Resolver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length > 5 && (
              <p style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.5rem' }}>
                Mostrando 5 de {requests.length} solicitudes
              </p>
            )}
          </div>
        )}
      </section>

      {/* Modal de resolución de correcciones */}
      {resolveId && (
        <form className="rc-modal" onSubmit={handleResolveCorrection}>
          <h4>Resolver Solicitud de Corrección</h4>
          <div className="rc-modal-content">
            <div className="rc-modal-group">
              <label>
                <input
                  type="radio"
                  checked={approve}
                  onChange={() => setApprove(true)}
                />
                {' '}✓ Aprobar y aplicar valor
              </label>
            </div>
            <div className="rc-modal-group" style={{ marginTop: '0.5rem' }}>
              <label>
                <input
                  type="radio"
                  checked={!approve}
                  onChange={() => setApprove(false)}
                />
                {' '}✗ Rechazar
              </label>
            </div>
            {approve && (
              <div className="rc-modal-group" style={{ marginTop: '1rem' }}>
                <label>Valor final:</label>
                <input
                  type="text"
                  value={appliedValue}
                  onChange={(e) => setAppliedValue(e.target.value)}
                  required={approve}
                  placeholder="Ej: 8.5"
                />
              </div>
            )}
            <div className="rc-modal-group" style={{ marginTop: '1rem' }}>
              <label>Comentario:</label>
              <textarea
                rows={3}
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="Comentario opcional para el docente..."
              />
            </div>
          </div>
          <div className="rc-actions">
            <button type="submit" className="rc-btn rc-btn-primary">
              Confirmar
            </button>
            <button
              type="button"
              className="rc-btn rc-btn-secondary"
              onClick={() => setResolveId(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* BÚSQUEDA DE BOLETINES */}
      <section className="rc-section">
        <h3>🔍 Búsqueda de Boletines</h3>

        <div className="rc-filters-panel">
          <div className="rc-filters-title">Filtros</div>
          <div className="rc-filters-grid">
            <div className="rc-filter-item">
              <label>Curso</label>
              <select value={searchCourse} onChange={(e) => setSearchCourse(e.target.value)}>
                <option value="">— Todos —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rc-filter-item">
              <label>Cédula Estudiante</label>
              <input
                type="text"
                placeholder="Ej: 1234567890"
                value={searchCedula}
                onChange={(e) => setSearchCedula(e.target.value)}
              />
            </div>

            <div className="rc-filter-item">
              <label>Nombre Estudiante</label>
              <input
                type="text"
                placeholder="Ej: Juan García"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>

            <div className="rc-filter-item">
              <label>Período</label>
              <select value={searchPeriod} onChange={(e) => setSearchPeriod(e.target.value)}>
                <option value="">— Todos —</option>
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rc-filter-item">
              <label>Año</label>
              <input
                type="number"
                min="2020"
                max="2099"
                value={searchYear}
                onChange={(e) => setSearchYear(e.target.value)}
              />
            </div>

            <div className="rc-filter-item">
              <label>&nbsp;</label>
              <button
                type="button"
                className="rc-btn rc-btn-secondary"
                onClick={clearSearch}
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {/* Resultados de búsqueda */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4>Resultados ({allReports.length})</h4>
            {loading && <span className="rc-loading">Buscando...</span>}
          </div>

          {allReports.length === 0 ? (
            <p className="rc-hint">No hay boletines que coincidan con los criterios de búsqueda.</p>
          ) : (
            <div className="rc-table-wrapper">
              <table className="rc-table">
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Grado / Curso</th>
                    <th>Período</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {allReports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <div>{report.studentName}</div>
                        <div style={{ fontSize: '0.85rem', color: '#999' }}>
                          {studentCedulaById[report.studentId] || '—'}
                        </div>
                      </td>
                      <td>
                        <div>{getGradeName(report.gradeId)}</div>
                        <div style={{ fontSize: '0.85rem', color: '#999' }}>
                          {getCourseName(report.courseId)}
                        </div>
                      </td>
                      <td>{getPeriodLabel(report.periodKey)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          <span className={`rc-badge ${report.published ? 'rc-badge-published' : 'rc-badge-draft'}`}>
                            {report.published ? '✓ Publicado' : '▪ Borrador'}
                          </span>
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
        </div>
      </section>

      {/* GENERAR NUEVO BOLETÍN */}
      <section className="rc-section">
        <h3>⚙️ Generar Nuevo Boletín</h3>
        <p className="rc-hint">
          Genera un boletín consolidado con las notas que los docentes han <strong>enviado</strong>.
        </p>

        <div className="rc-generation-panel">
          <div className="rc-filters-grid">
            <div className="rc-filter-item">
              <label>Estudiante *</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="">— Seleccionar estudiante —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.lastName} ({s.cedula}) · {s.enrollment?.courseName}
                  </option>
                ))}
              </select>
            </div>

            <div className="rc-filter-item">
              <label>Período *</label>
              <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rc-filter-item">
              <label>Año Académico</label>
              <input
                type="number"
                min="2020"
                max="2099"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              />
            </div>

            <div className="rc-filter-item">
              <label>&nbsp;</label>
              <button
                type="button"
                className="rc-btn rc-btn-secondary"
                onClick={handleGenerateReport}
              >
                Generar Boletín
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* VISTA PREVIA DE BOLETÍN */}
      {previewReport && previewReport.items && (
        <section className="rc-section">
          <h3>👁️ Vista Previa del Boletín</h3>

          <div className="rc-preview-header">
            <div>
              <h4>{previewReport.studentName}</h4>
              <p>
                <strong>Grado:</strong> {previewReport.gradeName} | <strong>Curso:</strong> {previewReport.courseName}
              </p>
              <p>
                <strong>Período:</strong> {getPeriodLabel(previewReport.periodKey)} | <strong>Año:</strong> {previewReport.academicYear}
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
                  <th>Escala</th>
                </tr>
              </thead>
              <tbody>
                {previewReport.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.subjectName}</td>
                    <td>{item.teacherName}</td>
                    <td>
                      <strong>{item.value}</strong>
                      {!item.includedFromSubmitted && item.value === '—' && (
                        <span style={{ color: '#f44', fontSize: '0.85rem', marginLeft: '0.3rem' }}>
                          (sin nota)
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#999' }}>
                      {item.gradingScale === 'numeric' && '0-10'}
                      {item.gradingScale === 'letters' && 'Letras'}
                      {item.gradingScale === 'descriptive' && 'Descriptiva'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rc-preview-actions">
            {!previewReport.published && (
              <button
                type="button"
                className="rc-btn rc-btn-primary"
                onClick={() => handlePublishReport(previewReport.id)}
              >
                📢 Publicar Boletín
              </button>
            )}
            {previewReport.published && !previewReport.sentToParents && (
              <button
                type="button"
                className="rc-btn rc-btn-primary"
                onClick={() => handleSendToParents(previewReport.id)}
                disabled={sendingReportId === previewReport.id}
              >
                {sendingReportId === previewReport.id ? 'Enviando...' : '✉️ Enviar a Padres'}
              </button>
            )}
            {previewReport.sentToParents && (
              <button
                type="button"
                className="rc-btn rc-btn-secondary"
                disabled
              >
                ✓ Enviado a Padres
              </button>
            )}
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
