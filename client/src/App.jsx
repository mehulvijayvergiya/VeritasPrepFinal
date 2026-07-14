import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Apply from "./pages/Apply.jsx";
import Confirmation from "./pages/Confirmation.jsx";
import Credits from "./pages/Credits.jsx";
import Login from "./pages/Login.jsx";
import Contact from "./pages/Contact.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import StudentRegister from "./pages/student/StudentRegister.jsx";
import StudentVerify from "./pages/student/StudentVerify.jsx";
import StudentForgotPassword from "./pages/student/StudentForgotPassword.jsx";
import StudentResetPassword from "./pages/student/StudentResetPassword.jsx";
import StudentDashboard from "./pages/student/StudentDashboard.jsx";
import StudentProtectedRoute from "./components/StudentProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/apply"
        element={<Apply />}
      />
      <Route path="/apply/confirmation" element={<Confirmation />} />
      <Route path="/credits" element={<Credits />} />
      <Route path="/contact" element={<Contact />} />

      <Route path="/login" element={<Login />} />
      {/* Old separate login paths now redirect to the combined one */}
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/student/login" element={<Navigate to="/login" replace />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="/student/register" element={<StudentRegister />} />
      <Route path="/student/verify" element={<StudentVerify />} />
      <Route path="/student/forgot-password" element={<StudentForgotPassword />} />
      <Route path="/student/reset-password" element={<StudentResetPassword />} />
      <Route
        path="/student/dashboard"
        element={
          <StudentProtectedRoute>
            <StudentDashboard />
          </StudentProtectedRoute>
        }
      />
    </Routes>
  );
}
