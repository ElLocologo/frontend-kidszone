import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Billing.css';

export default function ParentBillingView({ token, studentId }) {
  const [charges, setCharges] = useState([]);
  const [billing, setBilling] = useState([]);
  const [activeTab, setActiveTab] = useState('charges');
  const [loading, setLoading] = useState(true);
  const [expandedBillings, setExpandedBillings] = useState(new Set());

  useEffect(() => {
    if (studentId && token) {
      loadStudentCharges();
      loadStudentBilling();
    }
  }, [studentId, token]);

  const loadStudentCharges = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/services/student/${studentId}/charges`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCharges(response.data || []);
    } catch (error) {
      console.error('Error cargando cargos:', error);
      setCharges([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentBilling = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/services/student/${studentId}/billing`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setBilling(response.data || []);
    } catch (error) {
      console.error('Error cargando facturas:', error);
      setBilling([]);
    }
  };

  const chargeTypes = {
    material: '📚 Material',
    uniform: '👕 Uniforme',
    activity: '🎨 Actividad',
    other: '📦 Otro',
    tuition: '🏫 Colegiatura',
    enrollment: '📝 Matrícula',
  };

  const statusColors = {
    pending: '#FFC107',
    paid: '#4CAF50',
    overdue: '#F44336',
    cancelled: '#9E9E9E',
  };

  const statusTexts = {
    pending: '⏳ Pendiente',
    paid: '✅ Pagada',
    overdue: '⚠️ Vencida',
    cancelled: '❌ Cancelada',
  };

  const pendingCharges = charges.filter(c => c.status === 'pending');
  const totalPending = pendingCharges.reduce((sum, c) => sum + (c.amount || 0), 0);
  
  // Solo mostrar facturas pagadas como recibos
  const paidBilling = billing.filter(b => b.status === 'paid');

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>⏳ Cargando...</div>;
  }

  return (
    <div className="billing-manager">
      <div className="billing-header">
        <h3>💳 Mi Facturación</h3>
      </div>

      <div className="billing-tabs">
        <button
          className={activeTab === 'charges' ? 'active' : ''}
          onClick={() => setActiveTab('charges')}
        >
          📝 Cargos Pendientes
        </button>
        <button
          className={activeTab === 'billing' ? 'active' : ''}
          onClick={() => setActiveTab('billing')}
        >
          📄 Mis Facturas
        </button>
      </div>

      {activeTab === 'charges' && (
        <div className="charges-section">
          <div className="section-header">
            <h4>📝 Cargos Adicionales</h4>
          </div>

          <div className="charges-summary">
            <div className="summary-card">
              <h5>Total Pendiente</h5>
              <p className="amount">${totalPending.toFixed(2)}</p>
              <small>{pendingCharges.length} cargo(s)</small>
            </div>
          </div>

          {charges.length > 0 ? (
            <table className="charges-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {charges.map(charge => (
                  <tr key={charge.id}>
                    <td>{chargeTypes[charge.type] || charge.type}</td>
                    <td>{charge.description || 'N/A'}</td>
                    <td className="amount">${(charge.amount || 0).toFixed(2)}</td>
                    <td>{charge.dueDate ? new Date(charge.dueDate).toLocaleDateString('es-ES') : 'N/A'}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: statusColors[charge.status],
                        }}
                      >
                        {statusTexts[charge.status] || charge.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">✨ No hay cargos adicionales</p>
          )}
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="billing-section">
          <h4>📄 Mis Recibos de Pago</h4>
          {paidBilling.length > 0 ? (
            <div className="billing-cards">
              {paidBilling.map(bill => {
                const billKey = bill.id;
                const isExpanded = expandedBillings.has(billKey);
                
                return (
                  <div 
                    key={bill.id} 
                    className={`billing-card ${bill.status === 'cancelled' ? 'cancelled' : ''}`}
                    onClick={() => {
                      setExpandedBillings(new Set(
                        isExpanded 
                          ? Array.from(expandedBillings).filter(k => k !== billKey)
                          : [...expandedBillings, billKey]
                      ));
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="card-header">
                      <h5>
                        {new Date(bill.year, bill.month - 1).toLocaleDateString(
                          'es-ES',
                          { month: 'long', year: 'numeric' }
                        )}
                      </h5>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: statusColors[bill.status],
                        }}
                      >
                        {statusTexts[bill.status] || bill.status}
                      </span>
                    </div>
                    
                    <div className="card-body">
                      {/* Desglose de Cargos por Tipo */}
                      {bill.charges && bill.charges.length > 0 ? (
                        <div className="charges-breakdown">
                          {bill.charges.map((charge, idx) => (
                            <div key={idx} className="billing-row">
                              <span>{chargeTypes[charge.type] || charge.type}: {charge.description}</span>
                              <strong>${(charge.amount || 0).toFixed(2)}</strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="billing-row">
                          <span>Sin cargos registrados</span>
                          <strong>$0.00</strong>
                        </div>
                      )}

                      <div className="billing-row total">
                        <span>Total a Pagar:</span>
                        <strong>${(bill.total || bill.totalAmount || 0).toFixed(2)}</strong>
                      </div>
                      
                      <p className="due-date">
                        Vencimiento: {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('es-ES') : 'N/A'}
                      </p>

                      {/* Mostrar pagos registrados como comprobante */}
                      {bill.payments && bill.payments.length > 0 && (
                        <div className="payments-receipt">
                          <h6>📋 Comprobante de Pago</h6>
                          {bill.payments.map((payment, idx) => (
                            <div key={idx} className="receipt-item">
                              <span>Pago registrado: {new Date(payment.paidAt).toLocaleDateString('es-ES')}</span>
                              <strong>${(payment.amount || 0).toFixed(2)}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="empty-state">📭 No hay facturas pagadas. Los recibos aparecerán aquí una vez que se registre el pago desde el área de administración.</p>
          )}
        </div>
      )}
    </div>
  );
}
