import { requireOnboardedUser } from "@/lib/auth/guards";
import { MobileTopBar } from "@/components/shell/nav";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export const metadata = { title: "설정", robots: { index: false } };

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireOnboardedUser("/settings");
  return (
    <>
      <MobileTopBar title="설정" />
      <div className="mx-auto max-w-[720px] px-4 pt-4 pb-10 lg:pt-8">
        <h1 className="mb-4 hidden text-display font-bold lg:block">설정</h1>
        <SettingsTabs />
        <div className="pt-5">{children}</div>
      </div>
    </>
  );
}
