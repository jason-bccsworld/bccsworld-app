import { FARComplianceValidator } from "@/components/far-compliance-validator";

export default function FARCompliancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">FAR 142.73 Compliance Validation</h1>
        <p className="text-slate-600">Real-time monitoring of Federal Aviation Regulation Part 142.73 requirements</p>
      </div>
      <FARComplianceValidator />
    </div>
  );
}