// Stub hook — authentication is handled by the server.
// DashboardLayout is not used in this build; this stub prevents TS compile errors.
export function useAuth() {
  return { loading: false, user: null as null | { name: string; email: string }, logout: () => {} };
}
