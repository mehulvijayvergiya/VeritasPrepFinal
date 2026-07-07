import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Apply from "./pages/Apply.jsx";
import Confirmation from "./pages/Confirmation.jsx";
import Credits from "./pages/Credits.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

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
    </Routes>
  );
}
