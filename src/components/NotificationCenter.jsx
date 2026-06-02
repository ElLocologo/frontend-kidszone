import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Notifications.css';

export default function NotificationCenter({ token, userId }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const formatErr = (error, fallback) =>
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback;

  /**
   * Parsea una fecha de notificación con manejo de errores
   */
  const parseNotificationDate = (dateValue) => {
    if (!dateValue) return null;
    try {
      const d = dateValue instanceof Date 
        ? dateValue 
        : new Date(dateValue);
      
      // Validar que sea una fecha válida
      if (Number.isNaN(d.getTime())) {
        console.warn('[NOTIFICATION] Fecha inválida:', dateValue);
        return null;
      }
      return d;
    } catch (err) {
      console.error('[NOTIFICATION] Error parseando fecha:', err, dateValue);
      return null;
    }
  };

  /**
   * Formatea una fecha para mostrar
   */
  const formatNotificationDate = (dateValue) => {
    const date = parseNotificationDate(dateValue);
    if (!date) return '(fecha inválida)';
    
    try {
      return `${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch (err) {
      console.error('[NOTIFICATION] Error formateando fecha:', err);
      return '(error en formato)';
    }
  };

  const loadNotifications = async () => {
    if (!token) {
      console.warn('[NOTIFICATION] No hay token disponible');
      return;
    }
    
    setIsLoadingNotifications(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/services/notifications`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      // Validar que la respuesta sea un array
      if (!Array.isArray(response.data)) {
        console.error('[NOTIFICATION] Respuesta no es un array:', response.data);
        setNotifications([]);
      } else {
        console.log(`[NOTIFICATION] Cargadas ${response.data.length} notificaciones`);
        setNotifications(response.data);
      }
      setLoadError('');
    } catch (error) {
      console.error('[NOTIFICATION] Error cargando notificaciones:', error);
      setLoadError(formatErr(error, 'No se pudieron cargar las notificaciones.'));
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!token) return;
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/services/notifications/unread/count`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const count = response.data?.unreadCount ?? 0;
      setUnreadCount(count);
      console.log(`[NOTIFICATION] Notificaciones sin leer: ${count}`);
    } catch (error) {
      console.error('[NOTIFICATION] Error cargando contador:', error);
      setLoadError(formatErr(error, 'No se pudo actualizar el contador de avisos.'));
    }
  };

  useEffect(() => {
    if (!token) {
      console.warn('[NOTIFICATION] Sin token - NotificationCenter deshabilitado');
      return;
    }

    console.log('[NOTIFICATION] Inicializando NotificationCenter');
    loadNotifications();
    loadUnreadCount();

    // Actualizar contador cada 30 segundos
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [token]);

  const markAsRead = async (notificationId) => {
    if (!notificationId) {
      console.error('[NOTIFICATION] ID de notificación inválido');
      return;
    }
    
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/services/notifications/${notificationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log(`[NOTIFICATION] Marcada como leída: ${notificationId}`);
      
      // Actualizar estado local inmediatamente
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      
      // Recargar datos
      await Promise.all([loadNotifications(), loadUnreadCount()]);
    } catch (error) {
      console.error('[NOTIFICATION] Error marcando como leído:', error);
      setLoadError(formatErr(error, 'No se pudo marcar como leída.'));
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/services/notifications/read-all`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('[NOTIFICATION] Todas marcadas como leídas');
      
      // Actualizar estado local
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
      
      // Recargar datos
      await loadNotifications();
    } catch (error) {
      console.error('[NOTIFICATION] Error marcando todos como leído:', error);
      setLoadError(formatErr(error, 'No se pudieron marcar todas como leídas.'));
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!notificationId) {
      console.error('[NOTIFICATION] ID de notificación inválido para delete');
      return;
    }
    
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/services/notifications/${notificationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log(`[NOTIFICATION] Eliminada: ${notificationId}`);
      
      // Actualizar estado local inmediatamente
      setNotifications(prev =>
        prev.filter(n => n.id !== notificationId)
      );
      
      // Recargar datos
      await loadUnreadCount();
    } catch (error) {
      console.error('[NOTIFICATION] Error eliminando notificación:', error);
      setLoadError(formatErr(error, 'No se pudo eliminar la notificación.'));
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      payment: '💳',
      event: '🎉',
      attendance: '✅',
      activity: '🎨',
      system: '⚙️',
    };
    return icons[type] || '📢';
  };

  // Validar que cada notificación tenga ID único
  const validNotifications = notifications.filter(n => {
    if (!n || !n.id) {
      console.warn('[NOTIFICATION] Notificación sin ID:', n);
      return false;
    }
    return true;
  });

  const unreadNotifications = validNotifications.filter(n => !n.read);

  return (
    <div className="notification-center">
      {loadError && (
        <div className="notification-load-error" role="alert">
          <span>{loadError}</span>
          <button
            type="button"
            className="notification-load-error-dismiss"
            onClick={() => setLoadError('')}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      )}
      <button
        className="notification-bell"
        onClick={() => setShowPanel(!showPanel)}
        title={`${unreadCount} notificaciones sin leer`}
        aria-label={`Notificaciones (${unreadCount} sin leer)`}
      >
        🔔
        {unreadCount > 0 && <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {showPanel && (
        <div className="notification-panel" role="region" aria-label="Panel de notificaciones">
          <div className="panel-header">
            <h4>Notificaciones ({validNotifications.length})</h4>
            <div className="header-actions">
              {unreadCount > 0 && (
                <button 
                  className="btn-read-all" 
                  onClick={markAllAsRead}
                  disabled={isLoadingNotifications}
                  title="Marcar todas como leídas"
                >
                  Marcar todas como leídas
                </button>
              )}
              <button 
                className="btn-close" 
                onClick={() => setShowPanel(false)} 
                aria-label="Cerrar panel"
              >
                ❌
              </button>
            </div>
          </div>

          <div className="notification-list">
            {isLoadingNotifications && (
              <div className="loading-state">
                <p>⏳ Cargando notificaciones...</p>
              </div>
            )}
            {!isLoadingNotifications && validNotifications.length > 0 ? (
              validNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  role="article"
                  data-notification-id={notification.id}
                >
                  <span className="notification-icon" aria-hidden="true">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="notification-content">
                    <h5>{notification.title}</h5>
                    <p>{notification.message}</p>
                    <small>
                      {formatNotificationDate(notification.createdAt)}
                    </small>
                  </div>
                  <div className="notification-actions">
                    {!notification.read && (
                      <button
                        className="btn-action"
                        onClick={() => markAsRead(notification.id)}
                        title="Marcar como leído"
                        aria-label={`Marcar "${notification.title}" como leído`}
                      >
                        ✓
                      </button>
                    )}
                    <button
                      className="btn-delete"
                      onClick={() => deleteNotification(notification.id)}
                      title="Eliminar"
                      aria-label={`Eliminar "${notification.title}"`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            ) : (
              !isLoadingNotifications && (
                <div className="empty-state">
                  <p>📭 No hay notificaciones</p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
