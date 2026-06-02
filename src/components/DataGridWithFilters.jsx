import { useState } from 'react';
import './DataGridWithFilters.css';

/**
 * Componente reutilizable para mostrar datos en tarjetas con filtros
 * @param {Array} data - Array de datos a mostrar
 * @param {Array} filterFields - Campos por los que se puede filtrar (ej: ['cedula', 'name', 'email'])
 * @param {Function} onCardClick - Callback cuando se hace click en una tarjeta
 * @param {Array} cardFields - Campos que se muestran en cada tarjeta
 * @param {String} title - Título de la sección
 */
export default function DataGridWithFilters({
  data = [],
  filterFields = ['cedula', 'name', 'email'],
  onCardClick,
  cardFields = [],
  title = 'Datos',
  actions = [],
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  // Filtrar datos según búsqueda
  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    return filterFields.some((field) => {
      const value = item[field];
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(term);
    });
  });

  const handleCardClick = (item) => {
    if (onCardClick) {
      onCardClick(item);
    }
  };

  return (
    <div className="data-grid-container">
      <div className="grid-header">
        <h3>{title}</h3>
        <div className="filter-section">
          <input
            type="text"
            placeholder="🔍 Buscar por cédula, nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="filter-results">
            {filteredData.length} resultado{filteredData.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="cards-grid">
        {filteredData.length > 0 ? (
          filteredData.map((item) => (
            <div
              key={item.id}
              className="data-card"
              onClick={() => handleCardClick(item)}
            >
              {/* Header de la tarjeta */}
              <div className="card-header">
                <div className="card-title">
                  <h4>{item.name || item.fullName || 'Sin nombre'}</h4>
                  {item.cedula && <span className="badge-cedula">{item.cedula}</span>}
                </div>
              </div>

              {/* Contenido de la tarjeta */}
              <div className="card-content">
                {cardFields.map((field) => {
                  const value = item[field.key];
                  // Aplicar función de formato si existe
                  const displayValue = field.format ? field.format(value) : (value || '—');
                  return (
                    <div key={field.key} className="card-field">
                      <span className="field-label">{field.label}:</span>
                      <span className="field-value">{displayValue}</span>
                    </div>
                  );
                })}
              </div>

              {/* Footer con acciones */}
              <div className="card-footer">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    className={`action-btn action-${action.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick(item);
                    }}
                    title={action.label}
                  >
                    {action.icon} {action.label}
                  </button>
                ))}
              </div>

              {/* Badge de estado si existe */}
              {item.isActive !== undefined && (
                <div className={`status-badge ${item.isActive ? 'active' : 'inactive'}`}>
                  {item.isActive ? '✓ Activo' : '✕ Inactivo'}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>📭 No se encontraron resultados</p>
            {searchTerm && (
              <p className="hint">Intenta con otros términos de búsqueda</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
