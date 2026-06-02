import { useContext, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Cargando...</div>;
  }

  // Verificar primero en localStorage (más confiable)
  const storedUser = localStorage.getItem('user');
  if (!storedUser && !user) {
    return <Navigate to="/login" />;
  }

  const userRole = storedUser 
    ? JSON.parse(storedUser).role 
    : user?.role;

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/login" />;
  }

  return children;
}
