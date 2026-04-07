import type { Express } from "express";
import { z } from "zod";
import { cryptoSubscriptionService } from "../services/crypto-subscriptions";
import { isAuthenticated } from "../localAuth";
import { storage } from "../storage";

const setupCryptoSubscriptionSchema = z.object({
  tierId: z.string().uuid(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum wallet address"),
  stableCoin: z.enum(['USDC', 'USDT', 'DAI']),
  chainId: z.number().int().positive(),
  billingPeriod: z.enum(['monthly', 'annual'])
});

const renewSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid()
});

export function registerCryptoSubscriptionRoutes(app: Express) {
  // Setup crypto subscription
  app.post('/api/crypto/subscriptions/setup', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = setupCryptoSubscriptionSchema.parse(req.body);

      const result = await cryptoSubscriptionService.setupCryptoSubscription({
        customerId: userId,
        ...validatedData
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Crypto subscription setup error:", error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // Process subscription renewal
  app.post('/api/crypto/subscriptions/renew', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = renewSubscriptionSchema.parse(req.body);
      
      const result = await cryptoSubscriptionService.processSubscriptionRenewal(
        validatedData.subscriptionId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Subscription renewal error:", error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get subscription details
  app.get('/api/crypto/subscriptions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const subscriptionId = req.params.id;
      
      const details = await cryptoSubscriptionService.getSubscriptionDetails(subscriptionId);

      res.json({
        success: true,
        data: details
      });
    } catch (error) {
      console.error("Get subscription details error:", error);
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get user's crypto subscriptions
  app.get('/api/crypto/subscriptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const subscriptions = await storage.getCustomerSubscriptionsByUser(userId);

      res.json({
        success: true,
        data: subscriptions
      });
    } catch (error) {
      console.error("Get user subscriptions error:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get supported stablecoins and chains
  app.get('/api/crypto/config', async (req, res) => {
    try {
      const config = {
        supportedChains: [
          { id: 1, name: 'Ethereum', rpcUrl: process.env.ETHEREUM_RPC_URL ? 'configured' : 'not-configured' },
          { id: 137, name: 'Polygon', rpcUrl: process.env.POLYGON_RPC_URL ? 'configured' : 'not-configured' }
        ],
        supportedStableCoins: ['USDC', 'USDT', 'DAI'],
        contractAddresses: {
          1: {
            USDC: '0xA0b86a33E6A1B6b9eC8e3b0c8eDe8cE2E15dF9cA',
            USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
          },
          137: {
            USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
            DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
          }
        }
      };

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error("Get crypto config error:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Webhook for blockchain events (for production use with services like Alchemy, Moralis, etc.)
  app.post('/api/crypto/webhook', async (req, res) => {
    try {
      // Verify webhook signature in production
      const webhookData = req.body;
      
      // Process blockchain events
      if (webhookData.type === 'subscription_payment') {
        const { transactionHash, chainId, fromAddress, toAddress, amount } = webhookData.data;
        
        // Find corresponding subscription and update payment status
        await storage.createAuditLog({
          eventType: 'crypto_payment',
          severity: 'info',
          message: `Received crypto payment webhook`,
          details: webhookData,
          sourceSystem: 'crypto_service'
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Monitor payments for a specific chain (admin endpoint)
  app.post('/api/crypto/monitor/:chainId', isAuthenticated, async (req: any, res) => {
    try {
      const chainId = parseInt(req.params.chainId);
      const { fromBlock } = req.body;
      
      await cryptoSubscriptionService.monitorPayments(chainId, fromBlock);

      res.json({
        success: true,
        message: `Payment monitoring completed for chain ${chainId}`
      });
    } catch (error) {
      console.error("Payment monitoring error:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}