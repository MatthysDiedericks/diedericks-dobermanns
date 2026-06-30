import { AdminHeader } from "@/components/admin/AdminHeader";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <>
      <AdminHeader
        title="App Settings"
        subtitle="Social links, contact details, app store links, and media."
      />
      <SettingsForm initial={settings} />
    </>
  );
}
