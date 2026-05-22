import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  User,
} from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { getDocumentWhere, setDocument, getDocument } from "@/integrations/firebase/db";

type AppRole =
  | "student"
  | "admin"
  | "super_admin"
  | "instructor"
  | "global_super_admin"
  | "branch_super_admin"
  | "branch_admin";

// Firebase Auth user extended with a fake "session" shape so existing
// components that read session?.access_token still compile.
export interface Session {
  access_token: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    grade?: number,
    branchId?: string
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isInstructor: boolean;
  isGlobalSuperAdmin: boolean;
  isBranchSuperAdmin: boolean;
  isBranchAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (uid: string) => {
    const roleDoc = await getDocumentWhere("user_roles", "user_id", "==", uid);
    setRole((roleDoc?.role as AppRole) ?? "student");
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setSession({ access_token: token, user: firebaseUser });
        await fetchRole(firebaseUser.uid);
      } else {
        setSession(null);
        setRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    grade?: number,
    branchId?: string
  ) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // Create profile document in Firestore
      await setDocument("profiles", uid, {
        user_id: uid,
        full_name: fullName,
        grade: grade ?? null,
        branch_id: branchId ?? null,
        account_status: "pending",
        payment_status: "pending",
        is_deleted: false,
        is_suspended: false,
        welcome_email_sent: false,
        welcome_email_sent_at: null,
        avatar_url: null,
        phone_number: null,
        gender: null,
        date_of_birth: null,
        preferred_language: "en",
        student_id: null,
        payment_receipt_url: null,
        payment_method: null,
        payment_reference_number: null,
        payment_admin_comment: null,
      });

      // Create role document
      await setDocument("user_roles", uid, {
        user_id: uid,
        role: "student",
      });

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setRole(null);
    setSession(null);
  };

  const isGlobalSuperAdmin = role === "global_super_admin";
  const isBranchSuperAdmin = role === "branch_super_admin";
  const isBranchAdmin = role === "branch_admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        signUp,
        signIn,
        signOut,
        isAdmin:
          role === "admin" ||
          role === "super_admin" ||
          isGlobalSuperAdmin ||
          isBranchSuperAdmin ||
          isBranchAdmin,
        isSuperAdmin: role === "super_admin" || isGlobalSuperAdmin,
        isInstructor: role === "instructor",
        isGlobalSuperAdmin,
        isBranchSuperAdmin,
        isBranchAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// Re-export Firebase auth helpers for use in pages
export { sendPasswordResetEmail, updatePassword, auth };
