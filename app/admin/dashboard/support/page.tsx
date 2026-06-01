import PageContainer from "@/components/layout/page-container";
import { SupportManagement } from "@/components/dashboard/support-management";

export const metadata = {
  title: "Dashboard: Need Support",
};

export default function SupportPage() {
  return (
    <PageContainer scrollable={true} pageTitle="Need Support" pageDescription="Kelola laporan need support dari kasir.">
      <SupportManagement type="support" />
    </PageContainer>
  );
}
