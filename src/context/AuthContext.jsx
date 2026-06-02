import { createContext, useState, useEffect } from 'react';
import { 
  signInWithCustomToken, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut 
} from 'firebase/auth';
import { auth } from '../config/firebase';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  /**
   * Login - Autentica con Firebase y obtiene custom token del backend
   * @param {string} email 
   * @param {string} password 
   */
  const login = async (email, password) => {
    try {
      setError(null);
      const emailNorm = String(email ?? '').trim().toLowerCase();
      if (!emailNorm) {
        throw Object.assign(new Error('Introduce un email'), { code: 'auth/invalid-email' });
      }
      console.log('🔐 Iniciando login con Firebase...');
      
      // 1️⃣ Autenticar con Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, emailNorm, password);
      const firebaseUser = userCredential.user;
      
      console.log('✅ Autenticación Firebase exitosa:', firebaseUser.uid);

      // 2️⃣ Obtener custom token del backend
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/login`,
        { email: firebaseUser.email ?? emailNorm, uid: firebaseUser.uid }
      );

      const { token, user: userData } = response.data;

      // 3️⃣ Autenticar con el custom token en Firebase
      await signInWithCustomToken(auth, token);

      // 4️⃣ Guardar información en localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', token);

      console.log('✅ Login exitoso:', userData);
      return userData;

    } catch (err) {
      console.error('❌ Error en login:', err);
      
      let errorMessage = 'Error en el login';
      
      // Errores de Firebase
      if (err.code === 'auth/invalid-credential') {
        errorMessage =
          'Email o contraseña incorrectos. Si eres docente, confirma que el administrador te dio de alta con contraseña o usa "restablecer contraseña".';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'El usuario no existe';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Contraseña incorrecta';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos. Intenta más tarde';
      }
      // Errores del backend
      else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Registro de padre - Crea usuario en Firebase y perfil en Firestore
   */
  const registerParent = async (email, password, name) => {
    try {
      setError(null);
      console.log('👨‍👩‍👧 Registrando nuevo padre...');
      
      // 1️⃣ Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log('✅ Usuario creado en Firebase:', firebaseUser.uid);

      // 2️⃣ Crear perfil en Firestore (opcional - el backend también lo hace)
      // Esto se hace automáticamente en el backend cuando se crea el usuario

      // 3️⃣ Obtener custom token
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/register`,
        { email, password, name }
      );

      const { token, userId } = response.data;

      // 4️⃣ Autenticar con el custom token en Firebase
      await signInWithCustomToken(auth, token);

      // 5️⃣ Guardar información
      localStorage.setItem('user', JSON.stringify({ 
        id: userId, 
        email, 
        name, 
        role: 'parent' 
      }));
      localStorage.setItem('token', token);

      console.log('✅ Registro exitoso');
      return { id: userId, email, name, role: 'parent' };

    } catch (err) {
      console.error('❌ Error en registro:', err);
      
      let errorMessage = 'Error en el registro';
      
      // Errores de Firebase
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'El email ya está registrado';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es muy débil';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      }
      // Errores del backend
      else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Logout - Cierra sesión en Firebase y limpia localStorage
   */
  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
      console.log('✅ Logout exitoso');
    } catch (err) {
      console.error('❌ Error en logout:', err);
      setError('Error al cerrar sesión');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, registerParent, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
