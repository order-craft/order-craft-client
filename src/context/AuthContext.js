import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

// Safely decode a token and return the info we care about, or null.
const decodeToken = (token) => {
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    return {
      userId: decoded.userId || null,
      role: decoded.role || null,
      superClientId: decoded.superClientId || null,
      exp: decoded.exp || null,
    };
  } catch (err) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  const initialToken = localStorage.getItem("token");
  const [token, setToken] = useState(initialToken);
  const [user, setUser] = useState(() => decodeToken(initialToken));

  const isAuthenticated = Boolean(
    token && user && (!user.exp || user.exp * 1000 > Date.now()),
  );

  const login = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(decodeToken(newToken));
    navigate("/admin");
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    navigate("/login");
    window.location.reload();
  };

  // Check on mount + every 60s
  useEffect(() => {
    const check = () => {
      const current = localStorage.getItem("token");
      const decoded = decodeToken(current);
      if (
        !current ||
        !decoded ||
        (decoded.exp && decoded.exp * 1000 < Date.now())
      ) {
        if (current) logout();
      }
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        role: user?.role || null,
        userId: user?.userId || null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
