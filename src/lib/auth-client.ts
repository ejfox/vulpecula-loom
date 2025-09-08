import { createAuthClient } from "better-auth/vue";

// Better-auth client configuration
export const authClient = createAuthClient({
  baseURL: "http://localhost:3000/api/auth", // Your auth server
  fetchOptions: {
    onError: (context) => {
      console.error("Auth error:", context.error);
    },
    onRequest: (context) => {
      console.log("Auth request:", context.request.method, context.request.url);
    },
    onResponse: (context) => {
      console.log("Auth response:", context.response.status);
    }
  }
});

// Export auth methods for easier use
export const {
  signUp,
  signIn,
  signOut,
  useSession,
  getSession,
  onAuthStateChange
} = authClient;

// Types for better type safety
export type User = {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Session = {
  user: User;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    createdAt: Date;
  };
  token: string;
};