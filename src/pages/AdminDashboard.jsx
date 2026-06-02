import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import ScheduleManager from '../components/ScheduleManager';
import AcademicScheduleAdmin from '../components/AcademicScheduleAdmin';
import BoletinesAdmin from '../components/BoletinesAdmin';
import BillingManager from '../components/BillingManager';
import NotificationCenter from '../components/NotificationCenter';
import FeedbackModal from '../components/FeedbackModal';
import DataGridWithFilters from '../components/DataGridWithFilters';
import DetailedCardModal from '../components/DetailedCardModal';
import companyIcon from '../assets/images/company-icon.png';
import '../styles/AdminDashboard.css';

export default function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('teachers');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingParents, setLoadingParents] = useState(false);

  // Estados para formularios
  const [teacherForm, setTeacherForm] = useState({
    email: '',
    password: '',
    name: '',
    cedula: '',
    dateOfBirth: '',
    phone: '',
    specialization: '',
    yearsExperience: '',
  });

  const [studentForm, setStudentForm] = useState({
    name: '',
    lastName: '',
    cedula: '',
    email: '',
    dateOfBirth: '',
    gradeId: '',
    courseId: '',
    parentEmail: '',
    medicalInfo: {
      bloodType: '',
      chronicDiseases: '',
      medications: '',
    },
    allergies: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: '',
    },
  });

  const [gradesList, setGradesList] = useState([]);
  const [coursesForStudentForm, setCoursesForStudentForm] = useState([]);
  const [gradeForm, setGradeForm] = useState({
    name: '',
    level: '1',
    description: '',
    minAge: '',
    maxAge: '',
  });
  const [courseForm, setCourseForm] = useState({
    gradeId: '',
    name: '',
    code: '',
    section: 'A',
    capacity: '30',
    titularTeacherId: '',
  });
  const [coursesBrowseGradeId, setCoursesBrowseGradeId] = useState('');
  const [coursesBrowseList, setCoursesBrowseList] = useState([]);

  const [gradeEdit, setGradeEdit] = useState(null);
  const [courseEdit, setCourseEdit] = useState(null);
  const [studentEdit, setStudentEdit] = useState(null);
  const [transferForm, setTransferForm] = useState(null);
  const [transferCourseOptions, setTransferCourseOptions] = useState([]);

  // Estados para modales de fichas detalladas
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedParent, setSelectedParent] = useState(null);

  const [feedback, setFeedback] = useState({
    open: false,
    variant: 'success',
    title: '',
    detail: '',
  });
  const closeFeedback = () => setFeedback((f) => ({ ...f, open: false }));
  const notifySuccess = (title, detail = '') =>
    setFeedback({ open: true, variant: 'success', title, detail });
  const notifyError = (detail) =>
    setFeedback({
      open: true,
      variant: 'error',
      title: 'No se pudo completar la acción',
      detail: String(detail || ''),
    });

  const [studentParentPick, setStudentParentPick] = useState('');
  const [studentParentManualEmail, setStudentParentManualEmail] = useState('');
  const [linkParentFor, setLinkParentFor] = useState(null);
  const [linkParentEmail, setLinkParentEmail] = useState('');
  const [teacherEdit, setTeacherEdit] = useState(null);
  const [parentEdit, setParentEdit] = useState(null);

  const [parentForm, setParentForm] = useState({
    email: '',
    name: '',
    cedula: '',
    studentIds: [],
  });

  const [data, setData] = useState({
    teachers: [],
    students: [],
    parents: [],
  });

  const token = localStorage.getItem('token');
  const storedProfile = JSON.parse(localStorage.getItem('user') || '{}');
  const authHeaders = { Authorization: `Bearer ${token}` };

  const resolvedStudentParentEmail = () => {
    if (studentParentPick === '__manual__') {
      return studentParentManualEmail.trim().toLowerCase() || undefined;
    }
    if (studentParentPick && studentParentPick !== '__manual__') {
      return studentParentPick.trim().toLowerCase();
    }
    return undefined;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const createTeacher = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/teachers`,
        teacherForm,
        {
          headers: authHeaders,
        }
      );

      setTeacherForm({
        email: '',
        password: '',
        name: '',
        cedula: '',
        dateOfBirth: '',
        phone: '',
        specialization: '',
        yearsExperience: '',
      });

      notifySuccess(
        'Maestro registrado',
        'El docente puede iniciar sesión con el correo y la contraseña que configuraste.'
      );
      loadTeachers();
    } catch (error) {
      notifyError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const createStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.courseId) {
      notifyError('Selecciona un grado y un curso para matricular al estudiante.');
      return;
    }
    const parentEmailForApi = resolvedStudentParentEmail();
    setLoading(true);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/students`,
        {
          name: studentForm.name,
          lastName: studentForm.lastName,
          email: studentForm.email,
          cedula: studentForm.cedula,
          dateOfBirth: studentForm.dateOfBirth || null,
          courseId: studentForm.courseId,
          parentEmail: parentEmailForApi,
          medicalInfo: studentForm.medicalInfo,
          allergies: studentForm.allergies
            ? String(studentForm.allergies)
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
            : [],
          emergencyContact: studentForm.emergencyContact,
        },
        {
          headers: authHeaders,
        }
      );

      setStudentForm({
        name: '',
        lastName: '',
        email: '',
        dateOfBirth: '',
        gradeId: '',
        courseId: '',
        parentEmail: '',
        cedula: '',
        medicalInfo: {
          bloodType: '',
          chronicDiseases: '',
          medications: '',
        },
        allergies: '',
        emergencyContact: {
          name: '',
          phone: '',
          relationship: '',
        },
      });
      setCoursesForStudentForm([]);
      setStudentParentPick('');
      setStudentParentManualEmail('');

      notifySuccess(
        'Estudiante matriculado',
        parentEmailForApi
          ? `Quedó vinculado al padre/tutor con correo ${parentEmailForApi}.`
          : 'Puedes vincular un padre más tarde desde la tabla o creando la cuenta y usando «Vincular padre».'
      );
      loadStudents();
      loadParents();
      if (coursesBrowseGradeId) {
        loadCoursesBrowse(coursesBrowseGradeId);
      }
    } catch (error) {
      notifyError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const createParent = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/parents`,
        parentForm,
        {
          headers: authHeaders,
        }
      );

      setParentForm({
        email: '',
        name: '',
        cedula: '',
        studentIds: [],
      });

      notifySuccess(
        'Cuenta de padre creada',
        `Correo: ${response.data.email}\nContraseña temporal: ${response.data.tempPassword}\n\nSi seleccionaste hijos, ya quedaron vinculados en el sistema.`
      );
      loadParents();
      loadStudents();
    } catch (error) {
      notifyError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/teachers`,
        {
          headers: authHeaders,
        }
      );
      setData(prevData => ({ ...prevData, teachers: response.data }));
    } catch (error) {
      console.error('Error loading teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/students`,
        {
          headers: authHeaders,
        }
      );

      // Normalizar datos: asegurar que todos los estudiantes tengan propiedades necesarias
      const normalizedStudents = response.data.map((student) => ({
        ...student,
        enrollment: student.enrollment || { courseName: null, gradeName: null, status: 'inactive' },
        medicalInfo: student.medicalInfo || { bloodType: '', chronicDiseases: '', medications: '' },
        emergencyContact: student.emergencyContact || { name: '', phone: '', relationship: '' },
        allergies: student.allergies || [],
      }));

      console.log(`✓ Cargados ${normalizedStudents.length} estudiantes`);
      setData({ ...data, students: normalizedStudents });
    } catch (error) {
      console.error('Error loading students:', error);
      notifyError('Error al cargar estudiantes: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingStudents(false);
    }
  };
 
  const loadParents = async () => {
    setLoadingParents(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/parents`,
        {
          headers: authHeaders,
        }
      );
      console.log(`✓ Cargados ${response.data.length} padres`);
      setData(prevData => ({ ...prevData, parents: response.data }));
    } catch (error) {
      console.error('Error loading parents:', error);
      notifyError('Error al cargar padres: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingParents(false);
    }
  };

  const loadGrades = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/grades`,
        { headers: authHeaders }
      );
      setGradesList(response.data.grades || []);
    } catch (error) {
      console.error('Error loading grades:', error);
    }
  };

  const loadCoursesBrowse = async (gradeId) => {
    if (!gradeId) {
      setCoursesBrowseList([]);
      return;
    }
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/courses`,
        {
          headers: authHeaders,
          params: { gradeId, includeInactive: 'true' },
        }
      );
      setCoursesBrowseList(response.data.courses || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadCoursesForStudentForm = async (gradeId) => {
    if (!gradeId) {
      setCoursesForStudentForm([]);
      return;
    }
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/courses`,
        { headers: authHeaders, params: { gradeId } }
      );
      setCoursesForStudentForm(response.data.courses || []);
    } catch (error) {
      console.error('Error loading courses for form:', error);
    }
  };

  const createGrade = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/grades`,
        {
          name: gradeForm.name,
          level: Number(gradeForm.level),
          description: gradeForm.description || '',
          minAge: gradeForm.minAge !== '' ? Number(gradeForm.minAge) : 0,
          maxAge: gradeForm.maxAge !== '' ? Number(gradeForm.maxAge) : 0,
        },
        { headers: authHeaders }
      );
      setGradeForm({
        name: '',
        level: '1',
        description: '',
        minAge: '',
        maxAge: '',
      });
      notifySuccess('Grado creado', 'Ya puedes usar este grado al crear cursos.');
      await loadGrades();
    } catch (error) {
      notifyError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const createCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.gradeId || !courseForm.name || !courseForm.code || !courseForm.titularTeacherId) {
      notifyError('Completa grado, nombre, código y docente titular.');
      return;
    }
    const gradeIdCreated = courseForm.gradeId;
    const browseMatches = gradeIdCreated === coursesBrowseGradeId;
    const studentFormMatches = gradeIdCreated === studentForm.gradeId;
    setLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/courses`,
        {
          gradeId: gradeIdCreated,
          name: courseForm.name,
          code: courseForm.code,
          section: courseForm.section || 'A',
          capacity: Number(courseForm.capacity) || 30,
          titularTeacherId: courseForm.titularTeacherId,
        },
        { headers: authHeaders }
      );
      setCourseForm((prev) => ({
        ...prev,
        name: '',
        code: '',
        section: 'A',
        capacity: '30',
      }));
      notifySuccess('Curso creado', 'El docente titular ya puede ver el grupo.');
      await loadGrades();
      if (browseMatches) {
        await loadCoursesBrowse(coursesBrowseGradeId);
      }
      if (studentFormMatches) {
        await loadCoursesForStudentForm(studentForm.gradeId);
      }
    } catch (error) {
      notifyError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (val) => {
    if (val == null || val === '') return '';
    if (typeof val === 'string') return val.slice(0, 10);
    if (typeof val.toDate === 'function') {
      return val.toDate().toISOString().split('T')[0];
    }
    if (val._seconds != null) {
      return new Date(val._seconds * 1000).toISOString().split('T')[0];
    }
    return '';
  };

  const allergiesToString = (a) => {
    if (a == null || a === '') return '';
    if (Array.isArray(a)) return a.join(', ');
    return String(a);
  };

  const loadTransferCourses = async (gradeId) => {
    if (!gradeId) {
      setTransferCourseOptions([]);
      return;
    }
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/courses`,
        { headers: authHeaders, params: { gradeId } }
      );
      setTransferCourseOptions(response.data.courses || []);
    } catch (error) {
      console.error('Error cargando cursos para transferencia:', error);
      setTransferCourseOptions([]);
    }
  };

  const saveGradeEdit = async (e) => {
    e.preventDefault();
    if (!gradeEdit?.id) return;
    setLoading(true);
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/grades/${gradeEdit.id}`,
        {
          name: gradeEdit.name,
          level: Number(gradeEdit.level),
          description: gradeEdit.description || '',
          minAge: gradeEdit.minAge !== '' ? Number(gradeEdit.minAge) : 0,
          maxAge: gradeEdit.maxAge !== '' ? Number(gradeEdit.maxAge) : 0,
        },
        { headers: authHeaders }
      );
      setGradeEdit(null);
      notifySuccess('Grado actualizado');
      await loadGrades();
      if (coursesBrowseGradeId) await loadCoursesBrowse(coursesBrowseGradeId);
      await loadCoursesForStudentForm(studentForm.gradeId);
    } catch (error) {
      notifyError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const deactivateGrade = async (gradeId, gradeName) => {
    if (
      !window.confirm(
        `¿Desactivar el grado "${gradeName}"? También se desactivarán sus cursos.`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/grades/${gradeId}`,
        { headers: authHeaders }
      );
      setGradeEdit(null);
      notifySuccess('Grado desactivado', 'Sus cursos asociados también quedaron inactivos.');
      await loadGrades();
      if (coursesBrowseGradeId === gradeId) {
        setCoursesBrowseGradeId('');
        setCoursesBrowseList([]);
      }
      if (studentForm.gradeId === gradeId) {
        setStudentForm((prev) => ({ ...prev, gradeId: '', courseId: '' }));
        setCoursesForStudentForm([]);
      }
      await loadStudents();
    } catch (error) {
      notifyError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const openCourseEdit = (course) => {
    setCourseEdit({
      id: course.id,
      name: course.name || '',
      capacity: String(course.capacity ?? 30),
      roomNumber: course.roomNumber || '',
      isActive: course.isActive !== false,
    });
  };

  const saveCourseEdit = async (e) => {
    e.preventDefault();
    if (!courseEdit?.id) return;
    setLoading(true);
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/courses/${courseEdit.id}`,
        {
          name: courseEdit.name,
          capacity: Number(courseEdit.capacity) || 30,
          roomNumber: courseEdit.roomNumber || 'SIN ASIGNAR',
          isActive: courseEdit.isActive,
        },
        { headers: authHeaders }
      );
      setCourseEdit(null);
      notifySuccess('Curso actualizado');
      if (coursesBrowseGradeId) await loadCoursesBrowse(coursesBrowseGradeId);
      await loadCoursesForStudentForm(studentForm.gradeId);
      await loadStudents();
    } catch (error) {
      notifyError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const openStudentEdit = (student) => {
    setStudentEdit({
      id: student.id,
      name: student.name || '',
      lastName: student.lastName || '',
      cedula: student.cedula || '',
      email: student.email || '',
      dateOfBirth: formatDateForInput(student.dateOfBirth),
      allergiesStr: allergiesToString(student.medicalInfo?.allergies),
      medicalInfo: {
        bloodType: student.medicalInfo?.bloodType || '',
        chronicDiseases: Array.isArray(student.medicalInfo?.chronicDiseases)
          ? student.medicalInfo.chronicDiseases.join(', ')
          : student.medicalInfo?.chronicDiseases || '',
        medications: student.medicalInfo?.medications || '',
      },
      emergencyContact: {
        name: student.emergencyContact?.name || '',
        phone: student.emergencyContact?.phone || '',
        relationship: student.emergencyContact?.relationship || '',
      },
    });
    setTransferForm(null);
  };

  const saveStudentEdit = async (e) => {
    e.preventDefault();
    if (!studentEdit?.id) return;
    setLoading(true);
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/students/${studentEdit.id}`,
        {
          name: studentEdit.name,
          lastName: studentEdit.lastName,
          email: studentEdit.email,
          cedula: studentEdit.cedula,
          dateOfBirth: studentEdit.dateOfBirth || null,
          medicalInfo: {
            bloodType: studentEdit.medicalInfo.bloodType,
            chronicDiseases: studentEdit.medicalInfo.chronicDiseases,
            medications: studentEdit.medicalInfo.medications,
          },
          allergies: studentEdit.allergiesStr
            ? studentEdit.allergiesStr
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
            : [],
          emergencyContact: studentEdit.emergencyContact,
        },
        { headers: authHeaders }
      );
      setStudentEdit(null);
      notifySuccess('Datos del estudiante guardados');
      await loadStudents();
    } catch (error) {
      notifyError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const openTransfer = (student) => {
    const gid = student.enrollment?.gradeId || '';
    setTransferForm({
      studentId: student.id,
      label: `${student.name || ''} ${student.lastName || ''}`.trim(),
      targetGradeId: gid,
      targetCourseId: '',
    });
    setStudentEdit(null);
    loadTransferCourses(gid);
  };

  const submitTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm?.studentId || !transferForm.targetCourseId) {
      notifyError('Selecciona el curso de destino.');
      return;
    }
    setLoading(true);
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/students/${transferForm.studentId}/transfer`,
        { newCourseId: transferForm.targetCourseId },
        { headers: authHeaders }
      );
      setTransferForm(null);
      notifySuccess('Estudiante transferido', 'La matrícula quedó en el nuevo curso.');
      await loadStudents();
      if (coursesBrowseGradeId) await loadCoursesBrowse(coursesBrowseGradeId);
      await loadCoursesForStudentForm(studentForm.gradeId);
    } catch (error) {
      notifyError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const deactivateStudent = async (student) => {
    if (
      !window.confirm(
        `¿Dar de baja a ${student.name} ${student.lastName}? Se desactivará la matrícula actual.`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/students/${student.id}/deactivate`,
        {},
        { headers: authHeaders }
      );
      setStudentEdit(null);
      setTransferForm(null);
      notifySuccess('Baja registrada', 'La matrícula del estudiante pasó a inactiva.');
      await loadStudents();
      if (coursesBrowseGradeId) await loadCoursesBrowse(coursesBrowseGradeId);
    } catch (error) {
      notifyError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitLinkParent = async (e) => {
    e.preventDefault();
    if (!linkParentFor?.id) return;
    const email = linkParentEmail.trim().toLowerCase();
    if (!email) {
      notifyError(
        'Indica el correo del padre o tutor. Debe coincidir con una cuenta de padre ya registrada en el sistema.'
      );
      return;
    }
    setLoading(true);
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/students/${linkParentFor.id}/link-parent`,
        { parentEmail: email },
        { headers: authHeaders }
      );
      setLinkParentFor(null);
      setLinkParentEmail('');
      notifySuccess(
        'Padre vinculado',
        'La matrícula y las asociaciones quedaron actualizadas. El tutor verá al estudiante en su cuenta.'
      );
      await loadStudents();
      await loadParents();
    } catch (error) {
      notifyError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const openTeacherEdit = (teacher) => {
    setTeacherEdit({
      id: teacher.id,
      name: teacher.name || '',
      email: teacher.email || '',
      cedula: teacher.cedula || '',
      dateOfBirth: formatDateForInput(teacher.dateOfBirth),
      phone: teacher.phone || '',
      specialization: teacher.specialization || '',
      yearsExperience:
        teacher.yearsExperience !== undefined && teacher.yearsExperience !== null
          ? String(teacher.yearsExperience)
          : '',
      isActive: teacher.isActive !== false,
    });
  };

  const saveTeacherEdit = async (e) => {
    e.preventDefault();
    if (!teacherEdit?.id) return;
    setLoading(true);
    try {
      const payload = {
        name: teacherEdit.name,
        phone: teacherEdit.phone,
        cedula: teacherEdit.cedula,
        dateOfBirth: teacherEdit.dateOfBirth || null,
        specialization: teacherEdit.specialization,
        isActive: teacherEdit.isActive,
      };
      if (teacherEdit.yearsExperience !== '') {
        payload.yearsExperience = Number(teacherEdit.yearsExperience) || 0;
      }
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/admin/teachers/${teacherEdit.id}`,
        payload,
        { headers: authHeaders }
      );
      setTeacherEdit(null);
      notifySuccess('Maestro actualizado');
      await loadTeachers();
    } catch (error) {
      notifyError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetTeacherPasswordInline = async (teacherId) => {
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/teachers/${teacherId}/reset-password`,
        {},
        { headers: authHeaders }
      );
      notifySuccess(
        'Contraseña temporal (docente)',
        `Compártela por un canal seguro:\n${data.tempPassword}`
      );
    } catch (error) {
      notifyError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const openParentEdit = (parent) => {
    setParentEdit({
      id: parent.id,
      name: parent.name || '',
      email: parent.email || '',
      phone: parent.phone || '',
      cedula: parent.cedula || '',
      isActive: parent.isActive !== false,
    });
  };

  const saveParentEdit = async (e) => {
    e.preventDefault();
    if (!parentEdit?.id) return;
    setLoading(true);
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/admin/parents/${parentEdit.id}`,
        {
          name: parentEdit.name,
          phone: parentEdit.phone,
          cedula: parentEdit.cedula,
          isActive: parentEdit.isActive,
        },
        { headers: authHeaders }
      );
      setParentEdit(null);
      notifySuccess('Datos del padre actualizados');
      await loadParents();
      await loadStudents();
    } catch (error) {
      notifyError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetParentPasswordInline = async (parentId) => {
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/parents/${parentId}/reset-password`,
        {},
        { headers: authHeaders }
      );
      notifySuccess(
        'Contraseña temporal (padre)',
        `Compártela por un canal seguro:\n${data.tempPassword}`
      );
    } catch (error) {
      notifyError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleParentStudentSelect = (studentId) => {
    setParentForm((prev) => {
      const ids = prev.studentIds || [];
      const next = ids.includes(studentId)
        ? ids.filter((id) => id !== studentId)
        : [...ids, studentId];
      return { ...prev, studentIds: next };
    });
  };

  const clearStudentCreateForm = () => {
    setStudentForm({
      name: '',
      lastName: '',
      email: '',
      cedula: '',
      dateOfBirth: '',
      gradeId: '',
      courseId: '',
      parentEmail: '',
      medicalInfo: {
        bloodType: '',
        chronicDiseases: '',
        medications: '',
      },
      allergies: '',
      emergencyContact: {
        name: '',
        phone: '',
        relationship: '',
      },
    });
    setCoursesForStudentForm([]);
    setStudentParentPick('');
    setStudentParentManualEmail('');
  };

  return (
    <div className="admin-layout">
      {/* Sidebar Lateral */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-icon">
            <img src={companyIcon} alt="Logo de la empresa" className="company-icon" />
          </div>
          <h2>KIDS ZONE</h2>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'teachers' ? 'active' : ''}`}
            onClick={() => { setActiveTab('teachers'); loadTeachers(); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>Maestros</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('students');
              loadStudents();
              loadParents();
              loadGrades();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
            <span>Estudiantes</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'parents' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('parents');
              loadParents();
              loadStudents();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><circle cx="19" cy="11" r="3"></circle></svg>
            <span>Padres</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeTab === 'grades' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('grades');
              loadGrades();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
            <span>Grados</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('courses');
              loadGrades();
              loadTeachers();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
            <span>Cursos</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeTab === 'boletines' ? 'active' : ''}`}
            onClick={() => setActiveTab('boletines')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>
            <span>Boletines</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeTab === 'academic-schedule' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('academic-schedule');
              loadGrades();
              loadTeachers();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6v6l4 2" /><circle cx="12" cy="12" r="10" /></svg>
            <span>Horario escolar</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>Agenda</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20m9-5H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2z"></path></svg>
            <span>Facturación</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Cerrar menu"
          onClick={closeSidebar}
        />
      )}

      {/* Contenido Principal */}
      <main className="main-content">
        <header className="top-header">

          <button
            type="button"
            className="sidebar-toggle"
            aria-label={sidebarOpen ? 'Cerrar menu' : 'Abrir menu'}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="page-title">
            <h1>Panel de Administración</h1>
            <p>Bienvenido de nuevo, {user?.email}</p>
          </div>
          <div className="header-actions">
            <NotificationCenter token={token} userId={user?.uid} />
            <span className="badge-role">Administrador</span>
          </div>
        </header>

        <div className="content-container">
          {activeTab === 'teachers' && (
            <div className="tab-content">
              <h2>📋 Crear Nuevo Maestro</h2>
              <form onSubmit={createTeacher} className="form">
                <div className="form-group">
                  <label>👤 Nombre Completo *</label>
                  <input
                    type="text"
                    placeholder="Ej: Manuel García"
                    value={teacherForm.name}
                    onChange={(e) =>
                      setTeacherForm({ ...teacherForm, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className='form-group'>
                  <label>🪪 Documento de identidad *</label>
                  <input
                    type="text"
                    placeholder="Ej: 123456789"
                    value={teacherForm.cedula}
                    onChange={(e) =>
                      setTeacherForm({ ...teacherForm, cedula: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>📧 Email *</label>
                  <input
                    type="email"
                    placeholder="maestro@ejemplo.com"
                    value={teacherForm.email}
                    onChange={(e) =>
                      setTeacherForm({ ...teacherForm, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className='form-group'>
                  <label>🎂 Fecha de nacimiento</label>
                  <input type="date"
                    value={teacherForm.dateOfBirth}
                    onChange={(e) => setTeacherForm({ ...teacherForm, dateOfBirth: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>🔐 Contraseña *</label>
                  <input
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={teacherForm.password}
                    onChange={(e) =>
                      setTeacherForm({ ...teacherForm, password: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>📱 Teléfono</label>
                  <input
                    type="tel"
                    placeholder="+57 317 890 1234"
                    value={teacherForm.phone}
                    onChange={(e) =>
                      setTeacherForm({ ...teacherForm, phone: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>📚 Especialización</label>
                  <input
                    type="text"
                    placeholder="Ej: Matemáticas, Lengua"
                    value={teacherForm.specialization}
                    onChange={(e) =>
                      setTeacherForm({
                        ...teacherForm,
                        specialization: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>⏰ Años de Experiencia</label>
                  <input
                    type="number"
                    placeholder="Ej: 5"
                    value={teacherForm.yearsExperience}
                    onChange={(e) =>
                      setTeacherForm({
                        ...teacherForm,
                        yearsExperience: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-button-group">
                  <button type="submit" disabled={loading}>
                    {loading ? '⏳ Creando...' : '✅ Crear Maestro'}
                  </button>
                  <button type="reset">🔄 Limpiar</button>
                </div>
              </form>

              {teacherEdit && (
                <div className="data-section admin-edit-panel">
                  <h3>Editar maestro</h3>
                  <p className="form-hint" style={{ marginTop: 0 }}>
                    Correo: <strong>{teacherEdit.email}</strong> (no editable desde aquí)
                  </p>
                  <form className="form" onSubmit={saveTeacherEdit}>
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={teacherEdit.name}
                      onChange={(e) =>
                        setTeacherEdit({ ...teacherEdit, name: e.target.value })
                      }
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Teléfono"
                      value={teacherEdit.phone}
                      onChange={(e) =>
                        setTeacherEdit({ ...teacherEdit, phone: e.target.value })
                      }
                    />
                    <input
                      type="text"
                      placeholder="Especialización"
                      value={teacherEdit.specialization}
                      onChange={(e) =>
                        setTeacherEdit({
                          ...teacherEdit,
                          specialization: e.target.value,
                        })
                      }
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Años de experiencia"
                      value={teacherEdit.yearsExperience}
                      onChange={(e) =>
                        setTeacherEdit({
                          ...teacherEdit,
                          yearsExperience: e.target.value,
                        })
                      }
                    />
                    <input type="text"
                      placeholder="Cédula / Documento"
                      value={teacherEdit.cedula}
                      onChange={(e) => setTeacherEdit({ ...teacherEdit, cedula: e.target.value })}
                    />
                    <label
                      style={{
                        gridColumn: '1 / -1',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={teacherEdit.isActive}
                        onChange={(e) =>
                          setTeacherEdit({
                            ...teacherEdit,
                            isActive: e.target.checked,
                          })
                        }
                      />
                      Cuenta activa (si desactivas, no podrá iniciar sesión)
                    </label>
                    <div className="form-button-group" style={{ gridColumn: '1 / -1' }}>
                      <button type="submit" disabled={loading}>
                        Guardar cambios
                      </button>
                      <button
                        type="button"
                        onClick={() => resetTeacherPasswordInline(teacherEdit.id)}
                        disabled={loading}
                      >
                        Nueva contraseña temporal
                      </button>
                      <button type="button" onClick={() => setTeacherEdit(null)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Vista de Tarjetas de Maestros */}
              <DataGridWithFilters
                data={data.teachers}
                filterFields={['cedula', 'name', 'email']}
                title="👨‍🏫 Maestros Registrados"
                cardFields={[
                  { key: 'email', label: 'Email' },
                  { key: 'phone', label: 'Teléfono' },
                  { key: 'specialization', label: 'Especialización' },
                ]}
                onCardClick={(teacher) => setSelectedTeacher(teacher)}
                actions={[
                  {
                    id: 'view',
                    label: 'Ver ficha',
                    icon: '👁️',
                    onClick: (teacher) => setSelectedTeacher(teacher),
                  },
                  {
                    id: 'edit',
                    label: 'Editar',
                    icon: '✏️',
                    onClick: (teacher) => openTeacherEdit(teacher),
                  },
                ]}
              />

              {/* Modal con ficha detallada del maestro */}
              {selectedTeacher && (
                <DetailedCardModal
                  item={selectedTeacher}
                  title="Detalles del Maestro"
                  onClose={() => setSelectedTeacher(null)}
                  sections={[
                    {
                      title: 'Información Personal',
                      fields: [
                        { key: 'cedula', label: 'Cédula / Documento' },
                        { key: 'name', label: 'Nombre Completo' },
                        { key: 'email', label: 'Email' },
                        { key: 'phone', label: 'Teléfono' },
                      ],
                    },
                    {
                      title: 'Información Académica',
                      fields: [
                        { key: 'specialization', label: 'Especialización' },
                        {
                          key: 'yearsExperience',
                          label: 'Años de Experiencia',
                          format: (v) => `${v || 0} años`,
                        },
                      ],
                    },
                  ]}
                  actions={[
                    {
                      id: 'edit',
                      label: '✏️ Editar',
                      onClick: (teacher) => {
                        openTeacherEdit(teacher);
                        setSelectedTeacher(null);
                      },
                    },
                    {
                      id: 'password',
                      label: '🔑 Nueva contraseña',
                      onClick: (teacher) => {
                        resetTeacherPasswordInline(teacher.id);
                        setSelectedTeacher(null);
                      },
                      closeAfter: false,
                    },
                  ]}
                />
              )}
            </div>
          )}

          {activeTab === 'students' && (
            <div className="tab-content">
              <h2>📝 Crear Nuevo Estudiante</h2>
              {loadingStudents && (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#636e72',
                  backgroundColor: '#ecf0f1',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  <p>⏳ Cargando datos de estudiantes...</p>
                </div>
              )}
              <p style={{ color: '#636e72', marginTop: 0 }}>
                La matrícula en un curso es obligatoria (crea primero grados y cursos). Para el tutor: lo más claro es{' '}
                <strong>registrar la cuenta del padre</strong> en la pestaña Padres y luego elegirla aquí; también puedes
                escribir el correo si esa cuenta ya existe. Si matriculas sin padre, usa «Vincular padre» en la tabla.
              </p>
              <form onSubmit={createStudent} className="form">
                <div className='form-group-first form-group'>
                  <label>📝 Nombre *</label>
                  <input
                    type="text"
                    placeholder="Juanito"
                    value={studentForm.name}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className='form-group'>
                  <label>📝 Apellido *</label>
                  <input
                    type="text"
                    placeholder="Pérez"
                    value={studentForm.lastName}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, lastName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className='form-group'>
                  <label>🪪 Documento de identidad *</label>
                  <input
                    type="text"
                    placeholder="Cédula del estudiante"
                    value={studentForm.cedula}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, cedula: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>📧 Email *</label>
                  <input
                    type="email"
                    placeholder="Email del estudiante"
                    value={studentForm.email}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>📅 Fecha de nacimiento *</label>
                  <input
                    type="date"
                    placeholder='Fecha de nacimiento'
                    value={studentForm.dateOfBirth}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        dateOfBirth: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Grado académico *</label>
                  <select
                    value={studentForm.gradeId}
                    onChange={(e) => {
                      const gid = e.target.value;
                      setStudentForm({
                        ...studentForm,
                        gradeId: gid,
                        courseId: '',
                      });
                      loadCoursesForStudentForm(gid);
                    }}
                    required
                  >
                    <option value="">Selecciona un grado</option>
                    {gradesList.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} (nivel {g.level})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Curso / grupo *</label>
                  <select
                    value={studentForm.courseId}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        courseId: e.target.value,
                      })
                    }
                    required
                    disabled={!studentForm.gradeId}
                  >
                    <option value="">
                      {studentForm.gradeId
                        ? 'Selecciona un curso'
                        : 'Primero elige un grado'}
                    </option>
                    {coursesForStudentForm.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.section ? ` · ${c.section}` : ''}
                        {typeof c.enrolledCount === 'number' &&
                          typeof c.capacity === 'number'
                          ? ` (${c.enrolledCount}/${c.capacity})`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Padre o tutor (opcional)</label>
                  <p className="form-hint">
                    Lista de cuentas de padres registradas. «Otro correo» sirve cuando la cuenta ya existe pero no
                    aparece en la lista (mismo correo que usó al registrarse).
                  </p>
                  <select
                    value={studentParentPick}
                    onChange={(e) => {
                      const v = e.target.value;
                      setStudentParentPick(v);
                      if (v !== '__manual__') setStudentParentManualEmail('');
                    }}
                  >
                    <option value="">Sin vincular ahora</option>
                    <option value="__manual__">Otro correo (cuenta ya existente)</option>
                    {data.parents
                      .filter((p) => (p.email || '').trim())
                      .map((p) => {
                        const em = (p.email || '').trim().toLowerCase();
                        return (
                          <option key={p.id} value={em}>
                            {(p.name || em) + ` — ${em}`}
                          </option>
                        );
                      })}
                  </select>
                  {studentParentPick === '__manual__' ? (
                    <input
                      style={{ marginTop: 10 }}
                      type="email"
                      placeholder="Correo del padre o tutor"
                      value={studentParentManualEmail}
                      onChange={(e) => setStudentParentManualEmail(e.target.value)}
                    />
                  ) : null}
                </div>

                <h3>Información Médica</h3>
                <input
                  type="text"
                  placeholder="Tipo de Sangre"
                  value={studentForm.medicalInfo.bloodType}
                  onChange={(e) =>
                    setStudentForm({
                      ...studentForm,
                      medicalInfo: {
                        ...studentForm.medicalInfo,
                        bloodType: e.target.value,
                      },
                    })
                  }
                />
                <input
                  type="text"
                  placeholder="Enfermedades Crónicas"
                  value={studentForm.medicalInfo.chronicDiseases}
                  onChange={(e) =>
                    setStudentForm({
                      ...studentForm,
                      medicalInfo: {
                        ...studentForm.medicalInfo,
                        chronicDiseases: e.target.value,
                      },
                    })
                  }
                />
                <input
                  type="text"
                  placeholder="Medicamentos"
                  value={studentForm.medicalInfo.medications}
                  onChange={(e) =>
                    setStudentForm({
                      ...studentForm,
                      medicalInfo: {
                        ...studentForm.medicalInfo,
                        medications: e.target.value,
                      },
                    })
                  }
                />
                <input
                  type="text"
                  placeholder="Alergias (separadas por coma)"
                  value={studentForm.allergies}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, allergies: e.target.value })
                  }
                />

                <h3>Contacto de Emergencia</h3>
                <input
                  type="text"
                  placeholder="Nombre del Contacto"
                  value={studentForm.emergencyContact.name}
                  onChange={(e) =>
                    setStudentForm({
                      ...studentForm,
                      emergencyContact: {
                        ...studentForm.emergencyContact,
                        name: e.target.value,
                      },
                    })
                  }
                />
                <input
                  type="tel"
                  placeholder="Teléfono del Contacto"
                  value={studentForm.emergencyContact.phone}
                  onChange={(e) =>
                    setStudentForm({
                      ...studentForm,
                      emergencyContact: {
                        ...studentForm.emergencyContact,
                        phone: e.target.value,
                      },
                    })
                  }
                />
                <input
                  type="text"
                  placeholder="Relación (Ej: Abuelo, Tío)"
                  value={studentForm.emergencyContact.relationship}
                  onChange={(e) =>
                    setStudentForm({
                      ...studentForm,
                      emergencyContact: {
                        ...studentForm.emergencyContact,
                        relationship: e.target.value,
                      },
                    })
                  }
                />

                <button type="submit" disabled={loading}>
                  {loading ? '⏳ Creando...' : '✅ Crear Estudiante'}
                </button>
                <button type="reset" style={{ gridColumn: '1 / -1' }}>🔄 Limpiar</button>
              </form>

              {studentEdit && (
                <div className="data-section admin-edit-panel">
                  <h3>Editar estudiante</h3>
                  <form className="form" onSubmit={saveStudentEdit}>
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={studentEdit.name}
                      onChange={(e) =>
                        setStudentEdit({ ...studentEdit, name: e.target.value })
                      }
                      required
                    />
                    <input
                      type="text"
                      placeholder="Apellido"
                      value={studentEdit.lastName}
                      onChange={(e) =>
                        setStudentEdit({ ...studentEdit, lastName: e.target.value })
                      }
                      required
                    />
                    <input
                      type="text"
                      placeholder="Cédula / Documento"
                      value={studentEdit.cedula}
                      onChange={(e) => setStudentEdit({ ...studentEdit, cedula: e.target.value })}
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={studentEdit.email}
                      onChange={(e) =>
                        setStudentEdit({ ...studentEdit, email: e.target.value })
                      }
                      required
                    />
                    <input
                      type="date"
                      value={studentEdit.dateOfBirth}
                      onChange={(e) =>
                        setStudentEdit({
                          ...studentEdit,
                          dateOfBirth: e.target.value,
                        })
                      }
                    />
                    <h3 style={{ gridColumn: '1 / -1' }}>Información médica</h3>
                    <input
                      type="text"
                      placeholder="Tipo de sangre"
                      value={studentEdit.medicalInfo.bloodType}
                      onChange={(e) =>
                        setStudentEdit({
                          ...studentEdit,
                          medicalInfo: {
                            ...studentEdit.medicalInfo,
                            bloodType: e.target.value,
                          },
                        })
                      }
                    />
                    <input
                      type="text"
                      placeholder="Enfermedades crónicas"
                      value={studentEdit.medicalInfo.chronicDiseases}
                      onChange={(e) =>
                        setStudentEdit({
                          ...studentEdit,
                          medicalInfo: {
                            ...studentEdit.medicalInfo,
                            chronicDiseases: e.target.value,
                          },
                        })
                      }
                    />
                    <input
                      type="text"
                      placeholder="Medicamentos"
                      value={studentEdit.medicalInfo.medications}
                      onChange={(e) =>
                        setStudentEdit({
                          ...studentEdit,
                          medicalInfo: {
                            ...studentEdit.medicalInfo,
                            medications: e.target.value,
                          },
                        })
                      }
                    />
                    <input
                      type="text"
                      placeholder="Alergias (coma)"
                      value={studentEdit.allergiesStr}
                      onChange={(e) =>
                        setStudentEdit({
                          ...studentEdit,
                          allergiesStr: e.target.value,
                        })
                      }
                    />
                    <h3 style={{ gridColumn: '1 / -1' }}>Contacto de emergencia</h3>
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={studentEdit.emergencyContact.name}
                      onChange={(e) =>
                        setStudentEdit({
                          ...studentEdit,
                          emergencyContact: {
                            ...studentEdit.emergencyContact,
                            name: e.target.value,
                          },
                        })
                      }
                    />
                    <input
                      type="tel"
                      placeholder="Teléfono"
                      value={studentEdit.emergencyContact.phone}
                      onChange={(e) =>
                        setStudentEdit({
                          ...studentEdit,
                          emergencyContact: {
                            ...studentEdit.emergencyContact,
                            phone: e.target.value,
                          },
                        })
                      }
                    />
                    <input
                      type="text"
                      placeholder="Relación"
                      value={studentEdit.emergencyContact.relationship}
                      onChange={(e) =>
                        setStudentEdit({
                          ...studentEdit,
                          emergencyContact: {
                            ...studentEdit.emergencyContact,
                            relationship: e.target.value,
                          },
                        })
                      }
                    />
                    <div className="form-button-group" style={{ gridColumn: '1 / -1' }}>
                      <button type="submit" disabled={loading}>
                        Guardar cambios
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentEdit(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {transferForm && (
                <div className="data-section admin-edit-panel">
                  <h3>Transferir de curso — {transferForm.label}</h3>
                  <form className="form" onSubmit={submitTransfer}>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Grado destino</label>
                      <select
                        value={transferForm.targetGradeId}
                        onChange={(e) => {
                          const gid = e.target.value;
                          setTransferForm({
                            ...transferForm,
                            targetGradeId: gid,
                            targetCourseId: '',
                          });
                          loadTransferCourses(gid);
                        }}
                        required
                      >
                        <option value="">Selecciona grado</option>
                        {gradesList.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Curso destino</label>
                      <select
                        value={transferForm.targetCourseId}
                        onChange={(e) =>
                          setTransferForm({
                            ...transferForm,
                            targetCourseId: e.target.value,
                          })
                        }
                        required
                        disabled={!transferForm.targetGradeId}
                      >
                        <option value="">Selecciona curso</option>
                        {transferCourseOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.section ? ` · ${c.section}` : ''}
                            {typeof c.enrolledCount === 'number' &&
                              typeof c.capacity === 'number'
                              ? ` (${c.enrolledCount}/${c.capacity})`
                              : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-button-group" style={{ gridColumn: '1 / -1' }}>
                      <button type="submit" disabled={loading}>
                        Transferir
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransferForm(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {linkParentFor && (
                <div className="data-section admin-edit-panel">
                  <h3>Vincular padre — {linkParentFor.label}</h3>
                  <p className="form-hint" style={{ marginTop: 0 }}>
                    Introduce el correo de una cuenta de padre ya registrada. Se actualizarán la ficha del estudiante y
                    las asociaciones.
                  </p>
                  <form className="form" onSubmit={submitLinkParent}>
                    <input
                      type="email"
                      placeholder="Correo del padre/tutor"
                      value={linkParentEmail}
                      onChange={(e) => setLinkParentEmail(e.target.value)}
                      required
                      style={{ gridColumn: '1 / -1' }}
                    />
                    <div className="form-button-group" style={{ gridColumn: '1 / -1' }}>
                      <button type="submit" disabled={loading}>
                        Vincular
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLinkParentFor(null);
                          setLinkParentEmail('');
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Vista de Tarjetas de Estudiantes */}
              {loadingStudents ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  backgroundColor: '#f5f6fa',
                  borderRadius: '8px',
                  marginTop: '20px'
                }}>
                  <div style={{
                    display: 'inline-block',
                    width: '40px',
                    height: '40px',
                    border: '4px solid #e8eaed',
                    borderTop: '4px solid #2563eb',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}></div>
                  <p style={{ marginTop: '12px', color: '#636e72' }}>Cargando estudiantes...</p>
                </div>
              ) : (
                <DataGridWithFilters
                  data={data.students}
                  filterFields={['name', 'lastName', 'email', 'cedula']}
                  title="👨‍🎓 Estudiantes Registrados"
                  cardFields={[
                    { key: 'lastName', label: 'Apellido' },
                    {
                      key: 'enrollment',
                      label: 'Curso/Matrícula',
                      format: (e) => {
                        if (!e || typeof e !== 'object') return '—';
                        const course = e.courseName || '';
                        const grade = e.gradeName && e.gradeName !== '—' ? ` (${e.gradeName})` : '';
                        return course ? `${course}${grade}` : '—';
                      },
                    },
                    { key: 'parentEmail', label: 'Email Padre' },
                  ]}
                  onCardClick={(student) => setSelectedStudent(student)}
                  actions={[
                    {
                      id: 'view',
                      label: 'Ver ficha',
                      icon: '👁️',
                      onClick: (student) => setSelectedStudent(student),
                    },
                    {
                      id: 'edit',
                      label: 'Editar',
                      icon: '✏️',
                      onClick: (student) => openStudentEdit(student),
                    },
                  ]}
                />
              )}

              {/* Modal con ficha detallada del estudiante */}
              {selectedStudent && (
                <DetailedCardModal
                  item={selectedStudent}
                  title="Detalles del Estudiante"
                  onClose={() => setSelectedStudent(null)}
                  sections={[
                    {
                      title: 'Información Personal',
                      fields: [
                        { key: 'name', label: 'Nombre' },
                        { key: 'lastName', label: 'Apellido' },
                        { key: 'cedula', label: 'Cédula / Documento' },
                        { key: 'email', label: 'Email' },
                        { key: 'dateOfBirth', label: 'Fecha de Nacimiento' },
                      ],
                    },
                    {
                      title: 'Información Académica',
                      fields: [
                        {
                          key: 'enrollment',
                          label: 'Matrícula',
                          format: (e) => {
                            if (!e || typeof e !== 'object') return '—';
                            const course = e.courseName || '';
                            const grade = e.gradeName && e.gradeName !== '—' ? ` (${e.gradeName})` : '';
                            return course ? `${course}${grade}` : '—';
                          },
                        },
                        {
                          key: 'enrollment',
                          label: 'Estado',
                          format: (e) => {
                            if (!e || !e.status || typeof e.status !== 'string') return '—';
                            return e.status.charAt(0).toUpperCase() + e.status.slice(1);
                          },
                        },
                      ],
                    },
                    {
                      title: 'Información Médica',
                      fields: [
                        { key: 'medicalInfo', label: 'Tipo de Sangre', format: (m) => m && typeof m === 'object' ? (m.bloodType || '—') : '—' },
                        {
                          key: 'medicalInfo',
                          label: 'Enfermedades Crónicas',
                          format: (m) => m && typeof m === 'object' ? (m.chronicDiseases || '—') : '—',
                        },
                        { key: 'medicalInfo', label: 'Medicamentos', format: (m) => m && typeof m === 'object' ? (m.medications || '—') : '—' },
                        { key: 'allergies', label: 'Alergias', format: (a) => Array.isArray(a) ? (a.length > 0 ? a.join(', ') : '—') : (a || '—') },
                      ],
                    },
                    {
                      title: 'Contacto de Emergencia',
                      fields: [
                        { key: 'emergencyContact', label: 'Nombre', format: (ec) => ec && typeof ec === 'object' ? (ec.name || '—') : '—' },
                        { key: 'emergencyContact', label: 'Teléfono', format: (ec) => ec && typeof ec === 'object' ? (ec.phone || '—') : '—' },
                        { key: 'emergencyContact', label: 'Relación', format: (ec) => ec && typeof ec === 'object' ? (ec.relationship || '—') : '—' },
                      ],
                    },
                    {
                      title: 'Información del Padre/Tutor',
                      fields: [
                        { key: 'parentEmail', label: 'Email del Padre' },
                        { key: 'parentId', label: 'Vinculación', format: (pid) => pid ? '✓ Vinculado' : '✕ Sin vincular' },
                      ],
                    },
                  ]}
                  actions={[
                    {
                      id: 'edit',
                      label: '✏️ Editar',
                      onClick: (student) => {
                        openStudentEdit(student);
                        setSelectedStudent(null);
                      },
                    },
                    {
                      id: 'transfer',
                      label: '→ Transferir',
                      onClick: (student) => {
                        if (student.enrollment?.status === 'active') {
                          openTransfer(student);
                          setSelectedStudent(null);
                        } else {
                          notifyError('Solo se pueden transferir estudiantes con matrícula activa.');
                        }
                      },
                      closeAfter: false,
                    },
                  ]}
                />
              )}
            </div>
          )}

          {activeTab === 'grades' && (
            <div className="tab-content">
              <h2>📚 Grados académicos</h2>
              <p style={{ color: '#636e72', marginTop: 0 }}>
                Los grados se filtran por año académico actual. Crea al menos un grado antes de crear cursos y matricular estudiantes.
              </p>
              <form onSubmit={createGrade} className="form">
                <div className="form-group">
                  <label>Nombre del grado *</label>
                  <input
                    type="text"
                    value={gradeForm.name}
                    onChange={(e) =>
                      setGradeForm({ ...gradeForm, name: e.target.value })
                    }
                    placeholder="Ej: Primero Primaria"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Nivel (0–5) *</label>
                  <select
                    value={gradeForm.level}
                    onChange={(e) =>
                      setGradeForm({ ...gradeForm, level: e.target.value })
                    }
                    required
                  >
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={String(n)}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <input
                    type="text"
                    value={gradeForm.description}
                    onChange={(e) =>
                      setGradeForm({ ...gradeForm, description: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Edad mínima</label>
                  <input
                    type="number"
                    min="0"
                    value={gradeForm.minAge}
                    onChange={(e) =>
                      setGradeForm({ ...gradeForm, minAge: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Edad máxima</label>
                  <input
                    type="number"
                    min="0"
                    value={gradeForm.maxAge}
                    onChange={(e) =>
                      setGradeForm({ ...gradeForm, maxAge: e.target.value })
                    }
                  />
                </div>
                <div className="form-button-group">
                  <button type="submit" disabled={loading}>
                    {loading ? 'Guardando…' : 'Crear grado'}
                  </button>
                </div>
              </form>

              {gradeEdit && (
                <div className="data-section admin-edit-panel">
                  <h3>Editar grado</h3>
                  <form className="form" onSubmit={saveGradeEdit}>
                    <div className="form-group">
                      <label>Nombre *</label>
                      <input
                        type="text"
                        value={gradeEdit.name}
                        onChange={(e) =>
                          setGradeEdit({ ...gradeEdit, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Nivel (0–5) *</label>
                      <select
                        value={gradeEdit.level}
                        onChange={(e) =>
                          setGradeEdit({ ...gradeEdit, level: e.target.value })
                        }
                        required
                      >
                        {[0, 1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={String(n)}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Descripción</label>
                      <input
                        type="text"
                        value={gradeEdit.description}
                        onChange={(e) =>
                          setGradeEdit({
                            ...gradeEdit,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Edad mínima</label>
                      <input
                        type="number"
                        min="0"
                        value={gradeEdit.minAge}
                        onChange={(e) =>
                          setGradeEdit({ ...gradeEdit, minAge: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Edad máxima</label>
                      <input
                        type="number"
                        min="0"
                        value={gradeEdit.maxAge}
                        onChange={(e) =>
                          setGradeEdit({ ...gradeEdit, maxAge: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-button-group" style={{ gridColumn: '1 / -1' }}>
                      <button type="submit" disabled={loading}>
                        Guardar grado
                      </button>
                      <button type="button" onClick={() => setGradeEdit(null)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="data-section">
                <h3>Grados activos ({gradesList.length})</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Nivel</th>
                      <th>Año</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradesList.length > 0 ? (
                      gradesList.map((g) => (
                        <tr key={g.id}>
                          <td>{g.name}</td>
                          <td>{g.level}</td>
                          <td>{g.academicYear}</td>
                          <td>
                            <div className="admin-crud-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  setGradeEdit({
                                    id: g.id,
                                    name: g.name || '',
                                    level: String(g.level ?? 0),
                                    description: g.description || '',
                                    minAge:
                                      g.minAge !== undefined && g.minAge !== null
                                        ? String(g.minAge)
                                        : '',
                                    maxAge:
                                      g.maxAge !== undefined && g.maxAge !== null
                                        ? String(g.maxAge)
                                        : '',
                                  })
                                }
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="danger"
                                onClick={() => deactivateGrade(g.id, g.name)}
                              >
                                Desactivar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                          No hay grados. Crea uno con el formulario de arriba.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="tab-content">
              <h2>📖 Cursos (grupos)</h2>
              <p style={{ color: '#636e72', marginTop: 0 }}>
                Cada curso pertenece a un grado y tiene un docente titular. El código debe ser único en el año académico.
              </p>
              <form onSubmit={createCourse} className="form">
                <div className="form-group">
                  <label>Grado *</label>
                  <select
                    value={courseForm.gradeId}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, gradeId: e.target.value })
                    }
                    required
                  >
                    <option value="">Selecciona grado</option>
                    {gradesList.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Nombre del curso *</label>
                  <input
                    type="text"
                    value={courseForm.name}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, name: e.target.value })
                    }
                    placeholder="Ej: Primero A"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Código *</label>
                  <input
                    type="text"
                    value={courseForm.code}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, code: e.target.value })
                    }
                    placeholder="Ej: P1A-2026"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Sección</label>
                  <input
                    type="text"
                    value={courseForm.section}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, section: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Cupo</label>
                  <input
                    type="number"
                    min="1"
                    value={courseForm.capacity}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, capacity: e.target.value })
                    }
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Docente titular *</label>
                  <select
                    value={courseForm.titularTeacherId}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        titularTeacherId: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Selecciona un maestro</option>
                    {data.teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {(t.name || t.nombre || '').trim() || t.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-button-group">
                  <button type="submit" disabled={loading}>
                    {loading ? 'Guardando…' : 'Crear curso'}
                  </button>
                </div>
              </form>

              <div className="data-section">
                {courseEdit && (
                  <div className="admin-edit-panel" style={{ marginBottom: '24px' }}>
                    <h3>Editar curso</h3>
                    <form className="form" onSubmit={saveCourseEdit}>
                      <div className="form-group">
                        <label>Nombre *</label>
                        <input
                          type="text"
                          value={courseEdit.name}
                          onChange={(e) =>
                            setCourseEdit({ ...courseEdit, name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Cupo</label>
                        <input
                          type="number"
                          min="1"
                          value={courseEdit.capacity}
                          onChange={(e) =>
                            setCourseEdit({
                              ...courseEdit,
                              capacity: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Aula / salón</label>
                        <input
                          type="text"
                          value={courseEdit.roomNumber}
                          onChange={(e) =>
                            setCourseEdit({
                              ...courseEdit,
                              roomNumber: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={courseEdit.isActive}
                            onChange={(e) =>
                              setCourseEdit({
                                ...courseEdit,
                                isActive: e.target.checked,
                              })
                            }
                          />
                          Curso activo (visible para matrícula y docentes)
                        </label>
                      </div>
                      <div className="form-button-group" style={{ gridColumn: '1 / -1' }}>
                        <button type="submit" disabled={loading}>
                          Guardar curso
                        </button>
                        <button
                          type="button"
                          onClick={() => setCourseEdit(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <h3>Listado por grado</h3>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label>Ver cursos del grado</label>
                  <select
                    value={coursesBrowseGradeId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCoursesBrowseGradeId(v);
                      loadCoursesBrowse(v);
                      setCourseEdit(null);
                    }}
                  >
                    <option value="">Selecciona un grado</option>
                    {gradesList.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Curso</th>
                      <th>Sección</th>
                      <th>Código</th>
                      <th>Inscritos</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coursesBrowseList.length > 0 ? (
                      coursesBrowseList.map((c) => (
                        <tr key={c.id}>
                          <td>{c.name}</td>
                          <td>{c.section || '—'}</td>
                          <td>{c.code || '—'}</td>
                          <td>
                            {typeof c.enrolledCount === 'number'
                              ? `${c.enrolledCount}/${c.capacity ?? '—'}`
                              : '—'}
                          </td>
                          <td>{c.isActive === false ? 'Inactivo' : 'Activo'}</td>
                          <td>
                            <div className="admin-crud-actions">
                              <button
                                type="button"
                                onClick={() => openCourseEdit(c)}
                              >
                                Editar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                          {coursesBrowseGradeId
                            ? 'No hay cursos en este grado.'
                            : 'Elige un grado para listar cursos.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'boletines' && (
            <div className="tab-content">
              <h2 style={{ marginTop: 0 }}>Boletines y corrección de notas</h2>
              <BoletinesAdmin token={token} />
            </div>
          )}

          {activeTab === 'academic-schedule' && (
            <div className="tab-content">
              <h2 style={{ marginTop: 0 }}>Horario escolar y materias</h2>
              <p style={{ color: '#636e72', marginBottom: '1.25rem' }}>
                Solo administración puede crear materias y franjas. Docentes y padres solo visualizan el horario académico
                en sus paneles.
              </p>
              <AcademicScheduleAdmin token={token} />
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="tab-content">
              <ScheduleManager
                token={token}
                userRole={storedProfile.role || 'admin'}
              />
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="tab-content">
              <BillingManager token={token} />
            </div>
          )}

          {activeTab === 'parents' && (
            <div className="tab-content">
              <h2>Crear cuenta de padre o tutor</h2>
              <p className="form-hint" style={{ marginTop: 0, color: '#636e72' }}>
                Al crear la cuenta puedes marcar hijos ya matriculados sin otro padre asignado; el sistema los vincula al
                mismo correo. También puedes vincular después desde Estudiantes.
              </p>
              <form onSubmit={createParent} className="form">
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={parentForm.name}
                  onChange={(e) =>
                    setParentForm({ ...parentForm, name: e.target.value })
                  }
                  required
                />
                <input
                  type="email"
                  placeholder="Correo (será el usuario de acceso)"
                  value={parentForm.email}
                  onChange={(e) =>
                    setParentForm({ ...parentForm, email: e.target.value })
                  }
                  required
                />
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Hijos a vincular (opcional)</label>
                  <div className="admin-checkbox-list">
                    {data.students.filter(
                      (s) =>
                        s.enrollment?.status !== 'inactive' && !s.parentId
                    ).length === 0 ? (
                      <span style={{ color: '#636e72', fontSize: '0.95rem' }}>
                        No hay estudiantes activos sin padre asignado.
                      </span>
                    ) : (
                      data.students
                        .filter(
                          (s) =>
                            s.enrollment?.status !== 'inactive' && !s.parentId
                        )
                        .map((s) => (
                          <label key={s.id} className="admin-checkbox-row">
                            <input
                              type="checkbox"
                              checked={parentForm.studentIds.includes(s.id)}
                              onChange={() => toggleParentStudentSelect(s.id)}
                            />
                            <span>
                              {s.name} {s.lastName}
                              {s.enrollment?.courseName
                                ? ` · ${s.enrollment.courseName}`
                                : ''}
                            </span>
                          </label>
                        ))
                    )}
                  </div>
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear cuenta de padre'}
                </button>
              </form>

              {parentEdit && (
                <div className="data-section admin-edit-panel">
                  <h3>Editar padre / tutor</h3>
                  <p className="form-hint" style={{ marginTop: 0 }}>
                    Correo: <strong>{parentEdit.email}</strong>
                  </p>
                  <form className="form" onSubmit={saveParentEdit}>
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={parentEdit.name}
                      onChange={(e) =>
                        setParentEdit({ ...parentEdit, name: e.target.value })
                      }
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Teléfono"
                      value={parentEdit.phone}
                      onChange={(e) =>
                        setParentEdit({ ...parentEdit, phone: e.target.value })
                      }
                    />
                    <input
                      type="text"
                      placeholder='cedula'
                      value={parentEdit.cedula}
                      onChange={(e) =>
                        setParentEdit({ ...parentEdit, cedula: e.target.value })
                      }
                      required
                    />
                    <label
                      style={{
                        gridColumn: '1 / -1',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={parentEdit.isActive}
                        onChange={(e) =>
                          setParentEdit({
                            ...parentEdit,
                            isActive: e.target.checked,
                          })
                        }
                      />
                      Cuenta activa
                    </label>
                    <div className="form-button-group" style={{ gridColumn: '1 / -1' }}>
                      <button type="submit" disabled={loading}>
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => resetParentPasswordInline(parentEdit.id)}
                        disabled={loading}
                      >
                        Nueva contraseña temporal
                      </button>
                      <button type="button" onClick={() => setParentEdit(null)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Vista de Tarjetas de Padres */}
              {loadingParents ? (
                <div
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    backgroundColor: '#f5f6fa',
                    borderRadius: '8px',
                    marginTop: '20px',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-block',
                      width: '40px',
                      height: '40px',
                      border: '4px solid #e8eaed',
                      borderTop: '4px solid #2563eb',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  ></div>
                  <p style={{ marginTop: '12px', color: '#636e72' }}>Cargando padres...</p>
                </div>
              ) : (
                <DataGridWithFilters
                  data={data.parents}
                  filterFields={['name', 'email', 'phone']}
                  title="👨‍👩 Padres Registrados"
                  cardFields={[
                    { key: 'email', label: 'Email' },
                    { key: 'phone', label: 'Teléfono' },
                    { key: 'cedula', label: 'Cédula / Documento' },
                    {
                      key: 'children',
                      label: 'Hijos',
                      format: (c) =>
                        c?.length ?? 0,
                    },
                  ]}
                  onCardClick={(parent) => setSelectedParent(parent)}
                  actions={[
                    {
                      id: 'view',
                      label: 'Ver ficha',
                      icon: '👁️',
                      onClick: (parent) => setSelectedParent(parent),
                    },
                    {
                      id: 'edit',
                      label: 'Editar',
                      icon: '✏️',
                      onClick: (parent) => openParentEdit(parent),
                    },
                  ]}
                />
              )}

              {/* Modal con ficha detallada del padre */}
              {selectedParent && (
                <DetailedCardModal
                  item={selectedParent}
                  title="Detalles del Padre/Tutor"
                  onClose={() => setSelectedParent(null)}
                  sections={[
                    {
                      title: 'Información Personal',
                      fields: [
                        { key: 'name', label: 'Nombre' },
                        { key: 'email', label: 'Email' },
                        { key: 'phone', label: 'Teléfono' },
                        { key: 'cedula', label: 'Cédula / Documento' },
                      ],
                    },
                    {
                      title: 'Hijos Asociados',
                      fields: [
                        {
                          key: 'children',
                          label: 'Cantidad',
                          format: (c) => c?.length ?? 0,
                        },
                        {
                          key: 'children',
                          label: 'Nombres',
                          format: (childrenIds) => {
                            if (!Array.isArray(childrenIds) || childrenIds.length === 0) return '—';
                            const childNames = childrenIds
                              .map(child => child?.name?.trim()) // Saca el nombre y borra espacios
                              .filter(name => name)              // Elimina nulos o vacíos
                              .join(', ');
                            return childNames || '—';
                          },
                        },
                      ],
                    },
                  ]}
                  actions={[
                    {
                      id: 'edit',
                      label: '✏️ Editar',
                      onClick: (parent) => {
                        openParentEdit(parent);
                        setSelectedParent(null);
                      },
                    },
                    {
                      id: 'password',
                      label: '🔑 Nueva contraseña',
                      onClick: (parent) => {
                        resetParentPasswordInline(parent.id);
                        setSelectedParent(null);
                      },
                      closeAfter: false,
                    },
                  ]}
                />
              )}
            </div>
          )}
        </div>
      </main>
      <FeedbackModal
        open={feedback.open}
        onClose={closeFeedback}
        variant={feedback.variant}
        title={feedback.title}
        detail={feedback.detail}
      />
    </div>
  );
}
