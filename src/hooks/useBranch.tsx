import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getCollection, getDocument } from "@/integrations/firebase/db";
import { where } from "firebase/firestore";
import { useAuth } from "./useAuth";

interface Branch {
  id: string;
  name: string;
  code: string;
  description: string | null;
  address: string | null;
  is_active: boolean;
}

interface BranchContextType {
  currentBranch: Branch | null;
  branches: Branch[];
  loading: boolean;
  userBranchId: string | null;
  switchBranch: (branchId: string) => void;
  isGlobalRole: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider = ({ children }: { children: ReactNode }) => {
  const { user, role } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isGlobalRole =
    role === "super_admin" || (role as string) === "global_super_admin";

  useEffect(() => {
    if (!user) {
      setBranches([]);
      setCurrentBranch(null);
      setUserBranchId(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      const branchData = await getCollection<Branch>(
        "branches",
        where("is_active", "==", true)
      );
      setBranches(branchData);

      const profile = await getDocument<{ branch_id: string | null }>(
        "profiles",
        user.uid
      );
      const branchId = profile?.branch_id ?? null;
      setUserBranchId(branchId);

      if (branchId) {
        const found = branchData.find((b) => b.id === branchId);
        setCurrentBranch(found ?? null);
      } else if (isGlobalRole) {
        setCurrentBranch(null);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, role]);

  const switchBranch = (branchId: string) => {
    if (branchId === "all") { setCurrentBranch(null); return; }
    const found = branches.find((b) => b.id === branchId);
    if (found) setCurrentBranch(found);
  };

  return (
    <BranchContext.Provider
      value={{ currentBranch, branches, loading, userBranchId, switchBranch, isGlobalRole }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within BranchProvider");
  return ctx;
};
