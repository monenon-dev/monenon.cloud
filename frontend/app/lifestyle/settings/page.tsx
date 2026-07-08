import { UserPreferencesForm } from "@/components/settings/user-preferences-form";
import { UserWarningsBanner } from "@/components/settings/user-warnings-banner";

export default function SettingsPage() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-gray-50 px-4 py-6 dark:bg-gray-950 sm:px-6">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <UserWarningsBanner />
        <UserPreferencesForm showBackLink title="라이프스타일 선호도" constrainHeight />
      </div>
    </main>
  );
}
