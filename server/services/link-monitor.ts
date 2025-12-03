import { storage } from '../storage';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LinkStatus {
  url: string;
  status: 'active' | 'broken' | 'redirected' | 'changed';
  lastChecked: Date;
  responseCode?: number;
  newUrl?: string;
  contentChange?: boolean;
  errorMessage?: string;
}

export interface LinkMonitorAlert {
  id: string;
  checklistItemId: string;
  url: string;
  alertType: 'broken_link' | 'redirect_detected' | 'content_changed' | 'new_regulation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  detectedAt: Date;
  resolved: boolean;
  suggestedAction?: string;
  newUrl?: string;
}

export class LinkMonitoringService {
  private monitoredLinks: Map<string, LinkStatus> = new Map();
  private lastContentHashes: Map<string, string> = new Map();

  async initializeMonitoring(): Promise<void> {
    console.log('Initializing regulatory link monitoring system...');
    
    // Extract all regulatory links from the compliance checklist
    const regulatoryLinks = this.extractRegulatoryLinks();
    
    // Initialize monitoring for each link
    for (const link of regulatoryLinks) {
      await this.checkLinkStatus(link);
    }
    
    // Schedule regular monitoring
    this.schedulePeriodicChecks();
  }

  private extractRegulatoryLinks(): string[] {
    // Known regulatory base URLs that we monitor
    const regulatoryDomains = [
      'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-142',
      'https://www.faa.gov/regulations_policies/orders_notices/index.cfm/go/document.information/documentID/1034161',
      'https://www.ecfr.gov/current/title-14',
      'https://www.faa.gov/regulations_policies/',
      'https://www.gpo.gov/fdsys/pkg/CFR-2023-title14',
    ];

    return regulatoryDomains;
  }

  async checkLinkStatus(url: string): Promise<LinkStatus> {
    try {
      console.log(`Checking link status: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'BCCS-US-LinkMonitor/1.0 (Aviation Compliance Platform)',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      const linkStatus: LinkStatus = {
        url,
        status: response.ok ? 'active' : 'broken',
        lastChecked: new Date(),
        responseCode: response.status,
      };

      // Check for redirects
      if (response.redirected && response.url !== url) {
        linkStatus.status = 'redirected';
        linkStatus.newUrl = response.url;
        await this.createAlert(url, 'redirect_detected', 'medium', 
          `Regulatory link redirected from ${url} to ${response.url}`);
      }

      // Check for broken links
      if (!response.ok) {
        linkStatus.status = 'broken';
        linkStatus.errorMessage = `HTTP ${response.status} - ${response.statusText}`;
        await this.createAlert(url, 'broken_link', 'critical', 
          `Regulatory link broken: ${url} (${response.status})`);
      }

      // For successful requests, check content changes
      if (response.ok) {
        await this.checkContentChanges(url);
      }

      this.monitoredLinks.set(url, linkStatus);
      return linkStatus;

    } catch (error) {
      console.error(`Error checking link ${url}:`, error);
      
      const linkStatus: LinkStatus = {
        url,
        status: 'broken',
        lastChecked: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };

      await this.createAlert(url, 'broken_link', 'critical', 
        `Regulatory link failed to load: ${url} - ${linkStatus.errorMessage}`);
      
      this.monitoredLinks.set(url, linkStatus);
      return linkStatus;
    }
  }

  private async checkContentChanges(url: string): Promise<void> {
    try {
      // Get page content for analysis
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'BCCS-US-LinkMonitor/1.0 (Aviation Compliance Platform)',
        },
      });

      if (!response.ok) return;

      const content = await response.text();
      
      // Create content hash
      const contentHash = await this.createContentHash(content);
      const previousHash = this.lastContentHashes.get(url);

      if (previousHash && previousHash !== contentHash) {
        // Content has changed - analyze with AI
        const analysis = await this.analyzeContentChanges(url, content);
        
        if (analysis.significantChange) {
          await this.createAlert(url, 'content_changed', 'high', 
            `Regulatory content updated: ${analysis.summary}`);
        }
      }

      this.lastContentHashes.set(url, contentHash);

    } catch (error) {
      console.error(`Error checking content changes for ${url}:`, error);
    }
  }

  private async createContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async analyzeContentChanges(url: string, content: string): Promise<{
    significantChange: boolean;
    summary: string;
    impactLevel: 'low' | 'medium' | 'high';
  }> {
    try {
      const prompt = `
        Analyze this regulatory content change from ${url}.
        
        Determine if this is a significant change that would affect aviation training center compliance.
        
        Focus on:
        - New regulatory requirements
        - Changes to existing requirements
        - Updated compliance deadlines
        - Modified inspection procedures
        
        Content preview: ${content.substring(0, 2000)}...
        
        Respond with JSON:
        {
          "significantChange": boolean,
          "summary": "Brief description of key changes",
          "impactLevel": "low" | "medium" | "high"
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 300,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return analysis;

    } catch (error) {
      console.error('Error analyzing content changes:', error);
      return {
        significantChange: false,
        summary: 'Unable to analyze content changes',
        impactLevel: 'low'
      };
    }
  }

  private async createAlert(
    url: string,
    alertType: LinkMonitorAlert['alertType'],
    severity: LinkMonitorAlert['severity'],
    message: string
  ): Promise<void> {
    const alert: LinkMonitorAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      checklistItemId: this.findChecklistItemForUrl(url),
      url,
      alertType,
      severity,
      message,
      detectedAt: new Date(),
      resolved: false,
      suggestedAction: await this.generateSuggestedAction(alertType, url),
    };

    // Store alert in database
    await this.storeAlert(alert);
    
    // Send notification to administrators
    await this.notifyAdministrators(alert);
  }

  private findChecklistItemForUrl(url: string): string {
    // This would map URLs to specific checklist items
    // For now, return a general identifier
    return 'regulatory-reference';
  }

  private async generateSuggestedAction(
    alertType: LinkMonitorAlert['alertType'],
    url: string
  ): Promise<string> {
    switch (alertType) {
      case 'broken_link':
        return `Verify the new URL for this regulation and update checklist references. Check FAA website for relocated content.`;
      case 'redirect_detected':
        return `Update checklist to use the new URL to prevent future redirects.`;
      case 'content_changed':
        return `Review regulatory changes and update compliance procedures if necessary.`;
      case 'new_regulation':
        return `Assess impact on training center operations and update compliance checklist.`;
      default:
        return 'Review and take appropriate action.';
    }
  }

  private async storeAlert(alert: LinkMonitorAlert): Promise<void> {
    // Store in audit logs for tracking
    await storage.createAuditLog({
      eventType: 'link_check',
      severity: alert.severity,
      message: alert.message,
      sourceSystem: 'link_monitor',
      details: {
        url: alert.url,
        alertType: alert.alertType,
        suggestedAction: alert.suggestedAction,
      },
    });
  }

  private async notifyAdministrators(alert: LinkMonitorAlert): Promise<void> {
    console.log(`🚨 REGULATORY LINK ALERT [${alert.severity.toUpperCase()}]`);
    console.log(`Type: ${alert.alertType}`);
    console.log(`URL: ${alert.url}`);
    console.log(`Message: ${alert.message}`);
    console.log(`Suggested Action: ${alert.suggestedAction}`);
    
    // In production, this would send email/SMS notifications
    // For now, log to console and audit trail
  }

  private schedulePeriodicChecks(): void {
    // Check critical regulatory links daily
    setInterval(() => {
      console.log('Running daily regulatory link check...');
      this.initializeMonitoring();
    }, 24 * 60 * 60 * 1000);

    // Quick check every 4 hours for broken links
    setInterval(() => {
      console.log('Running quick link health check...');
      this.quickHealthCheck();
    }, 4 * 60 * 60 * 1000);
  }

  private async quickHealthCheck(): Promise<void> {
    const criticalLinks = Array.from(this.monitoredLinks.keys()).slice(0, 5);
    
    for (const url of criticalLinks) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, { 
          method: 'HEAD', 
          signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        if (!response.ok) {
          await this.createAlert(url, 'broken_link', 'critical', 
            `Critical regulatory link down: ${url} (${response.status})`);
        }
      } catch (error) {
        await this.createAlert(url, 'broken_link', 'critical', 
          `Critical regulatory link unreachable: ${url}`);
      }
    }
  }

  async getLinkStatus(url: string): Promise<LinkStatus | undefined> {
    return this.monitoredLinks.get(url);
  }

  async getAllLinkStatuses(): Promise<LinkStatus[]> {
    return Array.from(this.monitoredLinks.values());
  }

  async resolveAlert(alertId: string): Promise<void> {
    // Mark alert as resolved in database
    await storage.createAuditLog({
      eventType: 'link_check',
      severity: 'info',
      message: `Link monitoring alert resolved: ${alertId}`,
      sourceSystem: 'link_monitor',
      details: { resolved: true, alertId },
    });
  }
}

export const linkMonitoringService = new LinkMonitoringService();