"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type SignInResponse = {
  data: {
    user: User | null;
    session: Session | null;
  };
  error: AuthError | null;
};

type SignUpResponse = {
  data: {
    user: User | null;
    session: Session | null;
  };
  error: AuthError | null;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResponse>;
  signUp: (
    email: string,
    password: string,
    companyName?: string
  ) => Promise<SignUpResponse>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ data: { user: null, session: null }, error: null }),
  signUp: async () => ({ data: { user: null, session: null }, error: null }),
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        // Check for existing session first
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        console.log(
          "Initial session check:",
          session ? "Session found" : "No session",
          error
        );

        if (error) {
          console.error("Session retrieval error:", error);
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user || null);

          // Create profile if user exists but only if we haven't redirected
          if (session?.user) {
            await createOrUpdateProfile(session.user);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event, session?.user?.email || "no user");

      if (mounted) {
        setSession(session);
        setUser(session?.user || null);
        setLoading(false);

        // Handle auth events
        if (event === "SIGNED_IN" && session?.user) {
          await createOrUpdateProfile(session.user);
          router.push("/");
        } else if (event === "SIGNED_OUT") {
          router.push("/login");
        } else if (event === "TOKEN_REFRESHED") {
          console.log("Token refreshed successfully");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const createOrUpdateProfile = async (user: User) => {
    try {
      console.log("Checking profile for user:", user.id);

      const { data: existingProfile, error: selectError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle(); // Use maybeSingle() instead of single()

      if (selectError) {
        console.error("Error checking existing profile:", selectError);
        return;
      }

      if (!existingProfile) {
        console.log("Creating new profile...");
        const { error: insertError } = await supabase.from("profiles").insert({
          id: user.id,
          subscription_status: "trial",
          ai_queries_used: 0,
          ai_query_limit: 150,
        });

        if (insertError) {
          console.error("Error creating profile:", insertError);
        } else {
          console.log("Profile created successfully");
        }
      } else {
        console.log("Profile already exists");
      }
    } catch (error) {
      console.error("Profile operation failed:", error);
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<SignInResponse> => {
    try {
      console.log("Attempting sign in for:", email);
      setLoading(true);

      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log(
        "Sign in response:",
        response.error ? "Error" : "Success",
        response.error?.message
      );

      return response;
    } catch (error) {
      console.error("Sign in failed:", error);
      return {
        data: { user: null, session: null },
        error: error as AuthError,
      };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    companyName?: string
  ): Promise<SignUpResponse> => {
    try {
      console.log("Attempting sign up for:", email);
      setLoading(true);

      const response = await supabase.auth.signUp({
        email,
        password,
      });

      console.log(
        "Sign up response:",
        response.error ? "Error" : "Success",
        response.error?.message
      );

      // If signup successful and we have company name, update profile
      if (response.data.user && !response.error && companyName) {
        try {
          await supabase
            .from("profiles")
            .update({ company_name: companyName })
            .eq("id", response.data.user.id);
        } catch (error) {
          console.error("Failed to update company name:", error);
        }
      }

      return response;
    } catch (error) {
      console.error("Sign up failed:", error);
      return {
        data: { user: null, session: null },
        error: error as AuthError,
      };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log("Signing out...");
      setLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error signing out:", error);
      } else {
        console.log("Signed out successfully");
        // Clear local state immediately
        setSession(null);
        setUser(null);
      }
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
