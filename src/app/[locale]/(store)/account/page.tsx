import { ProfileView } from "@/features/account/profile-view";

// Client-gated page: no per-user prerender, so it may show a skeleton while the session loads.
export const instant = false;


export default function AccountPage() {
  return <ProfileView />;
}
