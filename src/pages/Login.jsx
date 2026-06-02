import { useState } from 'react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(email, password);
      console.log('✅ Login exitoso, userData:', userData);
      
      // Validar que userData tiene los datos necesarios
      if (!userData || !userData.role) {
        throw new Error('Datos de usuario incompletos');
      }
      
      // Redirigir según el rol del usuario
      if (userData.role === 'admin') {
        navigate('/admin');
      } else if (userData.role === 'teacher') {
        navigate('/teacher');
      } else if (userData.role === 'parent') {
        navigate('/parent');
      } else {
        console.warn('❌ Rol desconocido:', userData.role);
        setError(`Rol no reconocido: ${userData.role}`);
      }
    } catch (err) {
      console.error('❌ Error completo:', err);
      const errorMsg = err.message || err.toString() || 'Error al iniciar sesión';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>KIDS ZONE</h1>
        <h2>Iniciar Sesión</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="register-link">
          ¿No tienes cuenta? <a href="/register">Regístrate como Padre</a>
        </p>
      </div>
    </div>
  );
}
