import { Router } from 'express';
import { complianceAlertSystem } from '../services/compliance-alerts';
import { isAuthenticated } from '../replitAuth';

const router = Router();

// Get all active alerts
router.get('/api/alerts', isAuthenticated, async (req: any, res) => {
  try {
    const alerts = complianceAlertSystem.getAllActiveAlerts();
    const summary = complianceAlertSystem.getAlertSummary();
    
    res.json({
      alerts,
      summary
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Acknowledge an alert
router.post('/api/alerts/:alertId/acknowledge', isAuthenticated, async (req: any, res) => {
  try {
    const { alertId } = req.params;
    const success = complianceAlertSystem.acknowledgeAlert(alertId);
    
    if (success) {
      res.json({ success: true, message: 'Alert acknowledged' });
    } else {
      res.status(404).json({ error: 'Alert not found' });
    }
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

export default router;