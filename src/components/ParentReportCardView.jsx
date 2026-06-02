import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import '../styles/ReportCards.css';

export default function ParentReportCardView({ token, studentId }) {
  const apiBase = import.meta.env.VITE_API_URL;
  const headers = { Authorization: `Bearer ${token}` };

  const [index, setIndex] = useState([]);
  const [sel, setSel] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setIndex([]);
    setSel(null);
    setReport(null);
    setErr('');
  }, [studentId]);

  const loadIndex = useCallback(async () => {
    if (!token || !studentId) return;
    setLoading(true);
    setErr('');
    try {
      const res = await axios.get(`${apiBase}/api/report-cards/parent/${studentId}`, { headers });
      const reps = res.data.reports || [];
      setIndex(reps);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
      setIndex([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, studentId]);

  useEffect(() => {
    loadIndex();
  }, [loadIndex]);

  useEffect(() => {
    if (!index.length) {
      setSel(null);
      return;
    }
    setSel((prev) => {
      if (
        prev &&
        index.some(
          (r) => r.periodKey === prev.periodKey && Number(r.academicYear) === Number(prev.academicYear)
        )
      ) {
        return prev;
      }
      return {
        periodKey: index[0].periodKey,
        academicYear: index[0].academicYear,
      };
    });
  }, [index]);

  useEffect(() => {
    if (!token || !studentId || !sel?.periodKey) {
      setReport(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await axios.get(`${apiBase}/api/report-cards/parent/${studentId}`, {
          headers,
          params: {
            periodKey: sel.periodKey,
            academicYear: sel.academicYear,
          },
        });
        if (!cancelled) setReport(res.data.report || null);
      } catch (e) {
        if (!cancelled) {
          setReport(null);
          setErr(e.response?.data?.error || e.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase, token, studentId, sel]);

  const selectValue = sel ? `${sel.periodKey}__${sel.academicYear}` : '';

  if (!studentId) {
    return <p className="rc-hint">Selecciona un hijo/a para ver el boletín.</p>;
  }

  return (
    <div className="rc-wrap">
      {err && <div className="rc-banner rc-banner-error">✗ {err}</div>}

      <section className="rc-section" style={{ borderTop: 'none', paddingTop: 0 }}>
        <h3 style={{ marginTop: 0 }}>📖 Boletín de Calificaciones</h3>
        
        {!index.length && !err ? (
          <p className="rc-hint">
            ℹ️ Aún no hay boletines publicados para {studentId}. El administrador los generará
            y los compartirá contigo cuando estén listos.
          </p>
        ) : (
          <div className="rc-filters-panel">
            <div className="rc-filters-title">Selecciona un Boletín</div>
            <select
              value={selectValue}
              onChange={(e) => {
                const v = e.target.value;
                const [periodKey, academicYear] = v.split('__');
                setSel({ periodKey, academicYear: Number(academicYear) });
              }}
              disabled={!index.length}
              style={{
                padding: '0.5rem',
                fontSize: '1rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
              }}
            >
              {index.map((r) => (
                <option
                  key={`${r.periodKey}-${r.academicYear}`}
                  value={`${r.periodKey}__${r.academicYear}`}
                >
                  Período {r.periodKey} · Año {r.academicYear}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {loading && (
        <section className="rc-section">
          <p className="rc-hint">📥 Cargando boletín...</p>
        </section>
      )}

      {report && !loading && (
        <section className="rc-section">
          <h3>👤 {report.studentName}</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Grado</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '0.3rem' }}>
                {report.gradeName}
              </div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Curso</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '0.3rem' }}>
                {report.courseName}
              </div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Período</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '0.3rem' }}>
                {report.periodKey}
              </div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Año Académico</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '0.3rem' }}>
                {report.academicYear}
              </div>
            </div>
          </div>

          {report.publishedAt && (
            <div style={{ padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '8px', marginBottom: '1.5rem', borderLeft: '4px solid #4CAF50' }}>
              <div style={{ fontSize: '0.9rem', color: '#2e7d32' }}>
                ✓ Boletín compartido el{' '}
                <strong>
                  {new Date(report.publishedAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </strong>
              </div>
            </div>
          )}

          <h4>Calificaciones por Materia</h4>
          <div className="rc-table-wrapper">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Materia</th>
                  <th style={{ textAlign: 'center', width: '100px' }}>Calificación</th>
                  <th>Docente</th>
                  <th>Criterios de Desempeño</th>
                </tr>
              </thead>
              <tbody>
                {(report.items || []).map((row, i) => (
                  <tr key={`${row.subjectId}-${i}`}>
                    <td style={{ fontWeight: 'bold' }}>{row.subjectName}</td>
                    <td style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: '#1976D2' }}>
                      {row.value}
                    </td>
                    <td>{row.teacherName}</td>
                    <td style={{ fontSize: '0.9rem', color: '#555' }}>
                      {row.performanceCriteria || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#fff3e0', borderRadius: '8px', borderLeft: '4px solid #FF9800' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#e65100' }}>
              📝 <strong>Nota:</strong> Este boletín refleja las calificaciones enviadas por los docentes
              hasta la fecha de publicación. Para cualquier aclaración sobre las notas, comunícate con
              el colegio.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
