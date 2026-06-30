import { AccountSettings } from "@/components/AccountSettings";

export default function VenueSettingsPage() {
  return <AccountSettings exportEndpoint="/api/venues/me/export" />;
}
