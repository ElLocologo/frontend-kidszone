import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import ScheduleManager from '../components/ScheduleManager';
import AcademicTimetableView from '../components/AcademicTimetableView';
import ParentReportCardView from '../components/ParentReportCardView';
import ParentBillingView from '../components/ParentBillingView';
import NotificationCenter from '../components/NotificationCenter';
import '../styles/ParentDashboard.css';

export default function ParentDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('timetable');
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const storedProfile = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const loadChildren = async () => {
      if (!token || !user?.uid) {
        setLoading(false);
        setChildren([]);
        return;
      }
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/students/parent/${user.uid}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const list = response.data.students || [];
        setChildren(list);
        if (list.length > 0) {
          setSelectedChild(list[0].id);
        } else {
          setSelectedChild(null);
        }
      } catch (error) {
        console.error('Error cargando hijos:', error);
        setChildren([]);
        setSelectedChild(null);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    loadChildren();
  }, [token, user?.uid]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="parent-dashboard">
      <nav className="navbar">
        <h1>🌱 KIDS ZONE - Padre/Madre</h1>
        <div className="navbar-actions">
          <NotificationCenter token={token} userId={user?.uid} />
          <button onClick={handleLogout} className="logout-btn">🚪 Cerrar Sesión</button>
        </div>
      </nav>

      <div className="container">
        <div className="welcome-section">
          <h2>¡Bienvenido! 👋</h2>
          <p>Hola {user?.email}, aquí puedes ver la información de tus hijos</p>
        </div>

        {!loading && user?.uid && children.length > 0 && (
          <div className="child-selector">
            <label htmlFor="child-select">Selecciona un hijo/a:</label>
            <select 
              id="child-select"
              value={selectedChild || ''} 
              onChange={(e) => setSelectedChild(e.target.value)}
            >
              <option value="">-- Elige un hijo/a --</option>
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.name} {child.lastName}
                  {child.enrollment?.courseName
                    ? ` · ${child.enrollment.courseName}`
                    : child.grade
                      ? ` · Grado ${child.grade}`
                      : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {!loading && user?.uid && children.length === 0 && (
          <p style={{ textAlign: 'center', color: '#666', padding: '16px' }}>
            No hay estudiantes vinculados a tu cuenta. Si acabas de registrarte, contacta al administrador.
          </p>
        )}

        <div className="parent-tabs">
          <button 
            className={activeTab === 'timetable' ? 'active' : ''}
            onClick={() => setActiveTab('timetable')}
          >
            🕐 Horario escolar
          </button>
          <button 
            className={activeTab === 'boletin' ? 'active' : ''}
            onClick={() => setActiveTab('boletin')}
          >
            📋 Boletín
          </button>
          <button 
            className={activeTab === 'schedule' ? 'active' : ''}
            onClick={() => setActiveTab('schedule')}
          >
            📅 Agenda del Jardín
          </button>
          <button 
            className={activeTab === 'billing' ? 'active' : ''}
            onClick={() => setActiveTab('billing')}
          >
            💳 Mi Facturación
          </button>
        </div>

        {activeTab === 'timetable' && selectedChild && (
          <div className="tab-content">
            <AcademicTimetableView
              token={token}
              variant="parent"
              studentId={selectedChild}
            />
          </div>
        )}

        {activeTab === 'timetable' && !selectedChild && !loading && (
          <div className="tab-content">
            <p style={{ textAlign: 'center', color: '#666', padding: '24px' }}>
              Selecciona un hijo/a para ver su horario de clases.
            </p>
          </div>
        )}

        {activeTab === 'boletin' && selectedChild && (
          <div className="tab-content">
            <ParentReportCardView token={token} studentId={selectedChild} />
          </div>
        )}

        {activeTab === 'boletin' && !selectedChild && !loading && (
          <div className="tab-content">
            <p style={{ textAlign: 'center', color: '#666', padding: '24px' }}>
              Selecciona un hijo/a para ver su boletín.
            </p>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="tab-content">
            <ScheduleManager
              token={token}
              userRole={storedProfile.role || 'parent'}
            />
          </div>
        )}

        {activeTab === 'billing' && selectedChild && (
          <div className="tab-content">
            <ParentBillingView token={token} studentId={selectedChild} />
          </div>
        )}

        {activeTab === 'billing' && !selectedChild && (
          <div className="tab-content">
            <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
              ⚠️ Por favor selecciona un hijo/a para ver su facturación
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
