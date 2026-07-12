import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../firebase";
import { api } from "../api";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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

  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  // Admin status lives on the Firebase ID token as a custom claim (`admin: true`),
  // set server-side via the Firebase Admin SDK — see scripts/grant-admin.js.
  // Force-refresh so a claim granted after the user's last login is picked up
  // without requiring them to sign out and back in.
  const checkAdminStatus = async (firebaseUser, forceRefresh = false) => {
    if (!firebaseUser) {
      setIsAdmin(false);
      return false;
    }
    try {
      const tokenResult = await firebaseUser.getIdTokenResult(forceRefresh);
      const admin = tokenResult.claims?.admin === true;
      setIsAdmin(admin);
      return admin;
    } catch (err) {
      console.error("Failed to read admin claim:", err);
      setIsAdmin(false);
      return false;
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await checkAdminStatus(firebaseUser, true);
        try {
          await fetchUserData();
        } catch (err) {
          // No Mongo profile for this Firebase account yet — most likely an
          // account created before this backend existed. Self-heal by creating
          // it now (ensureUserProfile is idempotent) instead of 404-ing forever.
          try {
            await ensureUserProfile(firebaseUser.displayName || "", firebaseUser.phoneNumber || "");
            await fetchUserData();
          } catch (err2) {
            console.error("Failed to load or create user profile:", err2);
            setUserData(null);
          }
        }
      } else {
        setUserData(null);
        setIsAdmin(false);
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
        isAdmin,
        signup,
        login,
        loginWithGoogle,
        logout,
        resetPassword,
        fetchUserData,
        checkAdminStatus,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
