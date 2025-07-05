import { FARComplianceValidator } from "@/components/far-compliance-validator";
import Header from "@/components/header";

export default function FARCompliancePage() {
  return (
    <>
      <Header 
        title="FAR 142.73 Compliance Validation"
        description="Real-time monitoring of Federal Aviation Regulation Part 142.73 requirements"
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        <FARComplianceValidator />
      </main>
    </>
  );
}