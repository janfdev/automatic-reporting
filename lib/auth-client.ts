import { createAuthClient } from "better-auth/react";
import { adminClient, usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [usernameClient(), adminClient()]
});

export const { signIn, signUp, signOut, useSession, admin } = authClient;
