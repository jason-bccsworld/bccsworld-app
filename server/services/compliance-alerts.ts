export interface ComplianceAlert {
  id: string;
  type: 'DEADLINE' | 'EXPIRATION' | 'CRITICAL_ISSUE' | 'REGULATORY_CHANGE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  dueDate?: string;
  actionRequired: string;
  documentType?: string;
  createdAt: string;
  acknowledged: boolean;
}

export class ComplianceAlertSystem {
  private alerts: ComplianceAlert[] = [];

  generateDeadlineAlerts(documents: any[]): ComplianceAlert[] {
    const alerts: ComplianceAlert[] = [];
    const now = new Date();
    
    // Check for upcoming certification expirations
    documents.forEach(doc => {
      if (doc.extractedData) {
        const expirationData = doc.extractedData.find((d: any) => 
          d.fieldName?.includes('expiration') || d.fieldName?.includes('expires')
        );
        
        if (expirationData?.extractedValue) {
          const expirationDate = new Date(expirationData.extractedValue);
          const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiration <= 60 && daysUntilExpiration > 0) {
            alerts.push({
              id: `exp_${doc.id}_${Date.now()}`,
              type: 'EXPIRATION',
              severity: daysUntilExpiration <= 30 ? 'CRITICAL' : 'HIGH',
              title: `Certificate Expiring Soon`,
              description: `${doc.documentType} expires in ${daysUntilExpiration} days`,
              dueDate: expirationDate.toISOString(),
              actionRequired: 'Renew certificate before expiration',
              documentType: doc.documentType,
              createdAt: now.toISOString(),
              acknowledged: false
            });
          }
        }
      }
    });

    return alerts;
  }

  generateComplianceIssueAlerts(complianceResults: any[]): ComplianceAlert[] {
    const alerts: ComplianceAlert[] = [];
    const now = new Date();

    complianceResults.forEach(result => {
      if (result.riskLevel === 'CRITICAL' || result.riskLevel === 'HIGH') {
        alerts.push({
          id: `comp_${result.id || Date.now()}_${Math.random()}`,
          type: 'CRITICAL_ISSUE',
          severity: result.riskLevel,
          title: `Compliance Issue: ${result.checklistItem}`,
          description: result.findings || 'Critical compliance issue requires immediate attention',
          actionRequired: result.recommendedAction || 'Review and correct compliance issue',
          createdAt: now.toISOString(),
          acknowledged: false
        });
      }
    });

    return alerts;
  }

  generateRegulatoryChangeAlerts(): ComplianceAlert[] {
    // This would integrate with the regulatory monitoring system
    return [{
      id: `reg_${Date.now()}`,
      type: 'REGULATORY_CHANGE',
      severity: 'MEDIUM',
      title: 'Regulatory Update Available',
      description: 'New changes to FAR Part 142 have been detected',
      actionRequired: 'Review regulatory changes and update procedures as needed',
      createdAt: new Date().toISOString(),
      acknowledged: false
    }];
  }

  getAllActiveAlerts(): ComplianceAlert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  addAlert(alert: ComplianceAlert): void {
    this.alerts.push(alert);
  }

  getAlertSummary(): { total: number; critical: number; high: number; medium: number; low: number } {
    const activeAlerts = this.getAllActiveAlerts();
    return {
      total: activeAlerts.length,
      critical: activeAlerts.filter(a => a.severity === 'CRITICAL').length,
      high: activeAlerts.filter(a => a.severity === 'HIGH').length,
      medium: activeAlerts.filter(a => a.severity === 'MEDIUM').length,
      low: activeAlerts.filter(a => a.severity === 'LOW').length
    };
  }
}

export const complianceAlertSystem = new ComplianceAlertSystem();