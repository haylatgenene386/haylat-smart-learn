import { useEffect, useState } from "react";
import { getDocument } from "@/integrations/firebase/db";
import { useAuth } from "@/hooks/useAuth";

interface Profile {
  grade: number | null;
  full_name: string | null;
  branch_id: string | null;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    getDocument<Profile>("profiles", user.uid).then((data) => {
      setProfile(data);
      setLoading(false);
    });
  }, [user]);

  return { profile, loading, grade: profile?.grade ?? null };
};
