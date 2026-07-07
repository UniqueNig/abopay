import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";
import { api } from "../api";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    const { user: profile } = await api.get("/users/me");
    setUserData(profile);
    return profile;
  };

  // Creates the backend profile if it doesn't exist yet; idempotent, so it's
  // safe to call on every login, not just the first one.
  const ensureUserProfile = async (fullName, phone) => {
    await api.post("/users", { fullName, phone });
  };

  const signup = async (email, password, fullName, phone) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: fullName });
    await ensureUserProfile(fullName, phone);
    return result;
  };

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    await ensureUserProfile(result.user.displayName || "", result.user.phoneNumber || "");
    return result;
  };

  const logout = () => signOut(auth);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          await fetchUserData();
        } catch (err) {
          console.error("Failed to load user profile:", err);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        signup,
        login,
        loginWithGoogle,
        logout,
        fetchUserData,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
