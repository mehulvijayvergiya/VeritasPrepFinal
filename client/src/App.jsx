import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Apply from "./pages/Apply.jsx";
import Confirmation from "./pages/Confirmation.jsx";
import Credits from "./pages/Credits.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import StudentRegister from "./pages/student/StudentRegister.jsx";
import StudentLogin from "./pages/student/StudentLogin.jsx";
import StudentVerify from "./pages/student/StudentVerify.jsx";
import StudentForgotPassword from "./pages/student/StudentForgotPassword.jsx";
import StudentResetPassword from "./pages/student/StudentResetPassword.jsx";
import StudentDashboard from "./pages/student/StudentDashboard.jsx";
import StudentProtectedRoute from "./components/StudentProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/apply" element={<Apply />} />
      <Route path="/apply/confirmation" element={<Confirmation />} />
      <Route path="/credits" element={<Credits />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="/student/register" element={<StudentRegister />} />
      <Route path="/student/login" element={<StudentLogin />} />
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
