import PageContainer from "@/components/layout/page-container";
import { SupportManagement } from "@/components/dashboard/support-management";

export const metadata = {
  title: "Dashboard: Kendala",
};

export default function KendalaPage() {
  return (
    <PageContainer scrollable={true} pageTitle="Kendala" pageDescription="Kelola laporan kendala yang diinput kasir.">
      <SupportManagement type="kendala" />
    </PageContainer>
  );
}
