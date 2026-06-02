import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Billing.css';

export default function BillingManager({ token }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [charges, setCharges] = useState([]);
  const [billing, setBilling] = useState([]);
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [activeTab, setActiveTab] = useState('charges');
  const [showPaymentForm, setShowPaymentForm] = useState({});
  const [selectedBillingForPayment, setSelectedBillingForPayment] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'transfer',
    reference: '',
  });
  const [showGenerateBillingForm, setShowGenerateBillingForm] = useState(false);
  const [generateBillingData, setGenerateBillingData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [formData, setFormData] = useState({
    studentId: '',
    description: '',
    amount: '',
    type: 'tuition',
    dueDate: '',
  });

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentCharges(selectedStudent);
      loadStudentBilling(selectedStudent);
    }
  }, [selectedStudent]);

  const loadStudents = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/students`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setStudents(response.data);
    } catch (error) {
      console.error('Error cargando estudiantes:', error);
    }
  };

  const loadStudentCharges = async (studentId) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/services/student/${studentId}/charges`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCharges(response.data);
    } catch (error) {
      console.error('Error cargando cargos:', error);
    }
  };

  const loadStudentBilling = async (studentId) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/services/billing/details?studentId=${studentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setBilling(response.data.billings || response.data);
    } catch (error) {
      console.error('Error cargando facturas:', error);
      setBilling([]);
    }
  };

  const handleGenerateBilling = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/services/billing/generate`,
        {
          month: parseInt(generateBillingData.month),
          year: parseInt(generateBillingData.year),
          studentId: selectedStudent || undefined,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert(`✅ ${response.data.message}`);
      setShowGenerateBillingForm(false);
      if (selectedStudent) {
        loadStudentBilling(selectedStudent);
      }
    } catch (error) {
      alert('❌ Error: ' + error.response?.data?.error);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedBillingForPayment) return;

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/services/payments`,
        {
          billingId: selectedBillingForPayment,
          amount: parseFloat(paymentData.amount),
          method: paymentData.method,
          reference: paymentData.reference,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert('✅ Pago registrado correctamente');
      setPaymentData({ amount: '', method: 'transfer', reference: '' });
      setSelectedBillingForPayment(null);
      setShowPaymentForm({});
      if (selectedStudent) {
        loadStudentBilling(selectedStudent);
      }
    } catch (error) {
      alert('❌ Error: ' + error.response?.data?.error);
    }
  };

  const handleAddCharge = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/services/charges`,
        { ...formData, studentId: selectedStudent },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setFormData({
        studentId: '',
        description: '',
        amount: '',
        type: 'tuition',
        dueDate: '',
      });
      setShowChargeForm(false);
      loadStudentCharges(selectedStudent);
      alert('✅ Cargo adicional creado correctamente');
    } catch (error) {
      alert('❌ Error: ' + error.response?.data?.error);
    }
  };

  const chargeTypes = {
    tuition: '💵 Mensualidad',
    enrollment: '📜 Matrícula',
    material: '📚 Material',
    uniform: '👕 Uniforme',
    activity: '🎨 Actividad',
    other: '📦 Otro',
  };

  const paymentMethods = {
    transfer: '💳 Transferencia',
    cash: '💵 Efectivo',
    card: '💰 Tarjeta',
    check: '📋 Cheque',
  };

  const statusColors = {
    pending: '#FFC107',
    paid: '#4CAF50',
    overdue: '#F44336',
  };

  const pendingCharges = charges.filter(c => c.status === 'pending');
  const totalPending = pendingCharges.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="billing-manager">
      <div className="billing-header">
        <h3>💳 Gestión de Facturación y Cargos</h3>
      </div>

      <div className="billing-tabs">
        <button
          className={activeTab === 'charges' ? 'active' : ''}
          onClick={() => setActiveTab('charges')}
        >
          📝 Cargos Adicionales
        </button>
        <button
          className={activeTab === 'billing' ? 'active' : ''}
          onClick={() => setActiveTab('billing')}
        >
          📄 Facturas
        </button>
        <button
          className={activeTab === 'generate' ? 'active' : ''}
          onClick={() => setActiveTab('generate')}
        >
          ➕ Generar Facturas
        </button>
      </div>

      <div className="student-selector">
        <label>Seleccionar Estudiante:</label>
        <select
          value={selectedStudent || ''}
          onChange={(e) => setSelectedStudent(e.target.value)}
        >
          <option value="">-- Elige un estudiante --</option>
          {students.map(student => (
            <option key={student.id} value={student.id}>
              {student.name} {student.lastName} (Grado {student.grade})
            </option>
          ))}
        </select>
      </div>

      {selectedStudent && activeTab === 'charges' && (
        <div className="charges-section">
          <div className="section-header">
            <h4>📝 Cargos Adicionales</h4>
            <button
              className="btn-add"
              onClick={() => setShowChargeForm(!showChargeForm)}
            >
              {showChargeForm ? '✕' : '➕'} Nuevo Cargo
            </button>
          </div>

          {showChargeForm && (
            <form className="charge-form" onSubmit={handleAddCharge}>
              <div className="form-group">
                <label>Tipo de Cargo *</label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                >
                  <option value="tuition">💵 Mensualidad</option>
                  <option value="enrollment">📜 Matrícula</option>
                  <option value="material">📚 Material</option>
                  <option value="uniform">👕 Uniforme</option>
                  <option value="activity">🎨 Actividad</option>
                  <option value="other">📦 Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Descripción *</label>
                <input
                  type="text"
                  placeholder="Ej: Libreta de Matemáticas"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Monto ($) *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Fecha de Vencimiento</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                />
              </div>
              <button type="submit" className="btn-submit">
                ✅ Crear Cargo
              </button>
            </form>
          )}

          <div className="charges-summary">
            <div className="summary-card">
              <h5>Cargos Pendientes</h5>
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
                    <td>{chargeTypes[charge.type]}</td>
                    <td>{charge.description}</td>
                    <td className="amount">${charge.amount.toFixed(2)}</td>
                    <td>{new Date(charge.dueDate).toLocaleDateString('es-ES')}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: statusColors[charge.status],
                        }}
                      >
                        {charge.status === 'paid'
                          ? '✅ Pagado'
                          : charge.status === 'overdue'
                          ? '⚠️ Vencido'
                          : '⏳ Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">No hay cargos adicionales</p>
          )}
        </div>
      )}

      {selectedStudent && activeTab === 'billing' && (
        <div className="billing-section">
          <h4>📄 Facturas Mensuales</h4>
          {billing.length > 0 ? (
            <div className="billing-cards">
              {billing.map(bill => (
                <div key={bill.id} className="billing-card">
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
                      {bill.status === 'paid' ? '✅ Pagada' : '⏳ Pendiente'}
                    </span>
                  </div>
                  <div className="card-body">
                    {/* Desglose por Tipo de Cargo */}
                    {bill.chargesByType && (
                      <div className="charges-breakdown">
                        {bill.chargesByType.tuition && bill.chargesByType.tuition.length > 0 && (
                          <div className="charge-group">
                            <h6>💵 Mensualidades</h6>
                            {bill.chargesByType.tuition.map(charge => (
                              <div key={charge.id} className="charge-item">
                                <span>{charge.description}</span>
                                <strong>${charge.amount.toFixed(2)}</strong>
                              </div>
                            ))}
                          </div>
                        )}
                        {bill.chargesByType.enrollment && bill.chargesByType.enrollment.length > 0 && (
                          <div className="charge-group">
                            <h6>📜 Matrículas</h6>
                            {bill.chargesByType.enrollment.map(charge => (
                              <div key={charge.id} className="charge-item">
                                <span>{charge.description}</span>
                                <strong>${charge.amount.toFixed(2)}</strong>
                              </div>
                            ))}
                          </div>
                        )}
                        {bill.chargesByType.uniforms && bill.chargesByType.uniforms.length > 0 && (
                          <div className="charge-group">
                            <h6>👕 Uniformes</h6>
                            {bill.chargesByType.uniforms.map(charge => (
                              <div key={charge.id} className="charge-item">
                                <span>{charge.description}</span>
                                <strong>${charge.amount.toFixed(2)}</strong>
                              </div>
                            ))}
                          </div>
                        )}
                        {bill.chargesByType.materials && bill.chargesByType.materials.length > 0 && (
                          <div className="charge-group">
                            <h6>📚 Materiales</h6>
                            {bill.chargesByType.materials.map(charge => (
                              <div key={charge.id} className="charge-item">
                                <span>{charge.description}</span>
                                <strong>${charge.amount.toFixed(2)}</strong>
                              </div>
                            ))}
                          </div>
                        )}
                        {bill.chargesByType.activities && bill.chargesByType.activities.length > 0 && (
                          <div className="charge-group">
                            <h6>🎨 Actividades</h6>
                            {bill.chargesByType.activities.map(charge => (
                              <div key={charge.id} className="charge-item">
                                <span>{charge.description}</span>
                                <strong>${charge.amount.toFixed(2)}</strong>
                              </div>
                            ))}
                          </div>
                        )}
                        {bill.chargesByType.other && bill.chargesByType.other.length > 0 && (
                          <div className="charge-group">
                            <h6>📦 Otros</h6>
                            {bill.chargesByType.other.map(charge => (
                              <div key={charge.id} className="charge-item">
                                <span>{charge.description}</span>
                                <strong>${charge.amount.toFixed(2)}</strong>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="billing-row total">
                      <span>Total a Pagar:</span>
                      <strong>${bill.total.toFixed(2)}</strong>
                    </div>
                    <p className="due-date">
                      Vencimiento: {new Date(bill.dueDate).toLocaleDateString('es-ES')}
                    </p>

                    {/* Sección de Pagos Registrados */}
                    <div className="payments-section">
                      <h6>💳 Pagos Registrados</h6>
                      {bill.payments && bill.payments.length > 0 ? (
                        <div className="payments-list">
                          {bill.payments.map(payment => (
                            <div key={payment.id} className="payment-item">
                              <div className="payment-info">
                                <span className="payment-method">{paymentMethods[payment.method] || payment.method}</span>
                                <span className="payment-date">
                                  {new Date(payment.paidAt).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                              <span className="payment-amount">${payment.amount.toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="payment-total">
                            <strong>Total Pagado:</strong>
                            <strong>${(bill.payments?.reduce((sum, p) => sum + p.amount, 0) || 0).toFixed(2)}</strong>
                          </div>
                        </div>
                      ) : (
                        <p className="no-payments">Sin pagos registrados</p>
                      )}
                    </div>

                    {/* Formulario de Registrar Pago */}
                    {bill.status !== 'paid' && (
                      <div className="payment-form-section">
                        <button
                          className="btn-record-payment"
                          onClick={() => {
                            setSelectedBillingForPayment(bill.id);
                            setShowPaymentForm({ ...showPaymentForm, [bill.id]: !showPaymentForm[bill.id] });
                          }}
                        >
                          {showPaymentForm[bill.id] ? '✕ Cerrar' : '💰 Registrar Pago'}
                        </button>

                        {showPaymentForm[bill.id] && selectedBillingForPayment === bill.id && (
                          <form className="payment-form" onSubmit={handleRecordPayment}>
                            <div className="form-group">
                              <label>Monto Pagado ($) *</label>
                              <input
                                type="number"
                                placeholder="0.00"
                                step="0.01"
                                max={bill.total}
                                value={paymentData.amount}
                                onChange={(e) =>
                                  setPaymentData({ ...paymentData, amount: e.target.value })
                                }
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Método de Pago *</label>
                              <select
                                value={paymentData.method}
                                onChange={(e) =>
                                  setPaymentData({ ...paymentData, method: e.target.value })
                                }
                              >
                                <option value="transfer">💳 Transferencia</option>
                                <option value="cash">💵 Efectivo</option>
                                <option value="card">💰 Tarjeta</option>
                                <option value="check">📋 Cheque</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Referencia (opcional)</label>
                              <input
                                type="text"
                                placeholder="Ej: Número de transferencia, cheque..."
                                value={paymentData.reference}
                                onChange={(e) =>
                                  setPaymentData({ ...paymentData, reference: e.target.value })
                                }
                              />
                            </div>
                            <button type="submit" className="btn-submit">
                              ✅ Confirmar Pago
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No hay facturas generadas</p>
          )}
        </div>
      )}

      {activeTab === 'generate' && (
        <div className="generate-billing-section">
          <div className="section-header">
            <h4>➕ Generar Facturas Mensuales</h4>
            <p className="section-description">
              Genera facturas para uno o todos los estudiantes del mes seleccionado
            </p>
          </div>

          <form className="generate-billing-form" onSubmit={handleGenerateBilling}>
            <div className="form-group">
              <label>Mes *</label>
              <select
                value={generateBillingData.month}
                onChange={(e) =>
                  setGenerateBillingData({ ...generateBillingData, month: e.target.value })
                }
              >
                <option value="1">Enero</option>
                <option value="2">Febrero</option>
                <option value="3">Marzo</option>
                <option value="4">Abril</option>
                <option value="5">Mayo</option>
                <option value="6">Junio</option>
                <option value="7">Julio</option>
                <option value="8">Agosto</option>
                <option value="9">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
            </div>
            <div className="form-group">
              <label>Año *</label>
              <input
                type="number"
                value={generateBillingData.year}
                onChange={(e) =>
                  setGenerateBillingData({ ...generateBillingData, year: e.target.value })
                }
                min="2024"
                max="2099"
              />
            </div>
            <div className="form-group">
              <label>Aplicar a:</label>
              <div className="radio-group">
                <label>
                  <input type="radio" name="scope" defaultChecked disabled />
                  Todos los estudiantes
                </label>
              </div>
              {selectedStudent && (
                <div className="student-info">
                  <p>
                    <strong>Nota:</strong> Se generarán facturas para todos los estudiantes.
                    Las facturas ya existentes no serán duplicadas.
                  </p>
                </div>
              )}
            </div>
            <button type="submit" className="btn-submit btn-large">
              🔄 Generar Facturas
            </button>
          </form>

          <div className="billing-info">
            <h5>ℹ️ Información</h5>
            <ul>
              <li>Se crearán facturas para todos los estudiantes</li>
              <li>Se incluirán todos los cargos pendientes (mensualidad, matrícula, materiales, etc.)</li>
              <li>Se notificará automáticamente a los padres</li>
              <li>Las facturas no se duplicarán si ya existen para el mes</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
