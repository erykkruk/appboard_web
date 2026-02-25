import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

const baseURL =
	typeof window !== "undefined"
		? `${window.location.origin}/api/auth`
		: "http://localhost:6680/api/auth";

export const authClient = createAuthClient({
	baseURL,
	plugins: [emailOTPClient()],
});

export const { useSession, signOut } = authClient;
