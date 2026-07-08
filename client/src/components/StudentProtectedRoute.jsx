import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getStudentSession, onStudentAuthStateChange } from "../lib/studentAuth.js";

export default function StudentProtectedRoute({ children, redirectTo = "/login" }) {
  const [status, setStatus] = useState("checking"); // checking | authed | anon

  useEffect(() => {
    let active = true;
    getStudentSession().then((session) => {
      if (active) setStatus(session ? "authed" : "anon");
    });
    const subscription = onStudentAuthStateChange((session) => {
      if (active) setStatus(session ? "authed" : "anon");
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-parchment">
        <p className="font-body text-sm text-ink-400">Loading…</p>
      </div>
    );
  }

  if (status === "anon") return <Navigate to={redirectTo} replace />;
  return children;
}
