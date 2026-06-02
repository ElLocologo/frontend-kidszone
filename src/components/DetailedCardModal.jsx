import './DetailedCardModal.css';

/**
 * Modal para mostrar una ficha detallada de una persona
 * @param {Object} item - Datos de la persona
 * @param {Function} onClose - Callback para cerrar el modal
 * @param {Array} sections - Secciones a mostrar (ej: [{title: 'Información Personal', fields: [...]}, ...])
 * @param {Array} actions - Acciones disponibles en la ficha
 */
export default function DetailedCardModal({
  item,
  onClose,
  sections = [],
  actions = [],
  title = 'Detalles',
}) {
  if (!item) return null;

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      onClose();
    }
  };

  // Validar que sections es un array válido
  const validSections = Array.isArray(sections) ? sections : [];

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-card">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-section">
            <h2>{item.name || item.fullName || 'Sin nombre'}</h2>
            {item.cedula && (
              <p className="modal-cedula">
                <strong>Cédula:</strong> {item.cedula}
              </p>
            )}
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Body con scroll */}
        <div className="modal-body">
          {validSections.length > 0 ? (
            validSections.map((section, sectionIdx) => {
              // Validar que section y fields existen
              if (!section || !Array.isArray(section.fields)) {
                return null;
              }

              return (
                <div key={`section-${sectionIdx}`} className="modal-section">
                  <h3 className="section-title">{section.title || 'Sin título'}</h3>
                  <div className="section-fields">
                    {section.fields.map((field, fieldIdx) => {
                      // Validar que field existe
                      if (!field || !field.key) {
                        return null;
                      }

                      try {
                        const value = item[field.key];
                        let displayValue = value;

                        // Primero, intentar aplicar formato si existe
                        if (field.format && typeof field.format === 'function') {
                          try {
                            const result = field.format(value);
                            displayValue = result !== null && result !== undefined ? result : '—';
                          } catch (formatError) {
                            console.warn(`⚠️ Error formateando ${field.key}:`, formatError.message);
                            displayValue = '—';
                          }
                        } else {
                          // Si no hay formato, aplicar transformación por defecto
                          if (Array.isArray(value)) {
                            displayValue = value.join(', ') || '—';
                          } else if (value === null || value === undefined) {
                            displayValue = '—';
                          } else if (typeof value === 'object' && Object.keys(value).length === 0) {
                            displayValue = '—';
                          } else if (typeof value === 'object') {
                            displayValue = '—';
                          }
                        }

                        return (
                          <div key={`${field.key}-${fieldIdx}`} className="field-row">
                            <span className="field-label">{field.label || 'Sin label'}</span>
                            <span className="field-value">{displayValue}</span>
                          </div>
                        );
                      } catch (error) {
                        console.error(`❌ Error renderizando campo ${field.key}:`, error.message);
                        return (
                          <div key={`${field.key}-${fieldIdx}`} className="field-row">
                            <span className="field-label">{field.label || 'Sin label'}</span>
                            <span className="field-value">—</span>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="no-sections">No hay información disponible</p>
          )}
        </div>

        {/* Footer con acciones */}
        {Array.isArray(actions) && actions.length > 0 && (
          <div className="modal-footer">
            {actions.map((action) => {
              if (!action || !action.id) {
                return null;
              }

              return (
                <button
                  key={action.id}
                  className={`modal-action-btn btn-${action.id}`}
                  onClick={() => {
                    try {
                      if (action.onClick && typeof action.onClick === 'function') {
                        action.onClick(item);
                      }
                      if (action.closeAfter !== false) {
                        onClose();
                      }
                    } catch (actionError) {
                      console.error(`Error en acción ${action.id}:`, actionError);
                    }
                  }}
                >
                  {action.icon} {action.label}
                </button>
              );
            })}
            <button className="modal-action-btn btn-close" onClick={onClose}>
              ✕ Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
