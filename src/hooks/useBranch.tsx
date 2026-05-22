import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
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

  const isGlobalRole = role === "super_admin" || (role as string) === "global_super_admin";

  useEffect(() => {
    if (!user) {
      setBranches([]);
      setCurrentBranch(null);
      setUserBranchId(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      // Fetch all active branches
      const { data: branchData } = await supabase
        .from("branches")
        .select("*")
        .eq("is_active", true)
        .order("name");

      setBranches((branchData as Branch[]) ?? []);

      // Fetch user's branch from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("branch_id")
        .eq("user_id", user.id)
        .single();

      const branchId = profile?.branch_id ?? null;
      setUserBranchId(branchId);

      if (branchId && branchData) {
        const found = branchData.find((b: any) => b.id === branchId);
        setCurrentBranch((found as Branch) ?? null);
      } else if (isGlobalRole && branchData?.length) {
        // Global admins see all, default to first branch or null (all branches)
        setCurrentBranch(null);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, role]);

  const switchBranch = (branchId: string) => {
    if (branchId === "all") {
      setCurrentBranch(null);
      return;
    }
    const found = branches.find((b) => b.id === branchId);
    if (found) setCurrentBranch(found);
  };

  return (
    <BranchContext.Provider value={{ currentBranch, branches, loading, userBranchId, switchBranch, isGlobalRole }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within BranchProvider");
  return ctx;
};
