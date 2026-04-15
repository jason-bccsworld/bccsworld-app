import { ethers } from 'ethers';
import { storage } from '../storage';
import type { 
  InsertCryptoPayment, 
  InsertCustomerSubscription,
  SmartContract,
  CustomerSubscription 
} from '@shared/schema';

// Smart contract ABI for subscription management
const SUBSCRIPTION_CONTRACT_ABI = [
  "function subscribe(address token, uint256 amount, uint256 duration) external",
  "function renewSubscription(bytes32 subscriptionId) external", 
  "function cancelSubscription(bytes32 subscriptionId) external",
  "function getSubscription(bytes32 subscriptionId) external view returns (bool active, uint256 expiresAt, uint256 amount)",
  "function calculateRenewalCost(bytes32 subscriptionId) external view returns (uint256)",
  "event SubscriptionCreated(bytes32 indexed subscriptionId, address indexed user, uint256 amount, uint256 expiresAt)",
  "event SubscriptionRenewed(bytes32 indexed subscriptionId, uint256 newExpiresAt, uint256 amount)",
  "event SubscriptionCancelled(bytes32 indexed subscriptionId)"
];

// Supported stablecoin contracts
const STABLECOIN_CONTRACTS = {
  1: { // Ethereum Mainnet
    USDC: '0xA0b86a33E6A1B6b9eC8e3b0c8eDe8cE2E15dF9cA',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  },
  137: { // Polygon
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
  }
};

export class CryptoSubscriptionService {
  private providers: Map<number, ethers.JsonRpcProvider> = new Map();
  private contracts: Map<string, ethers.Contract> = new Map();

  public isConfigured: boolean = false;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    try {
      if (process.env.ETHEREUM_RPC_URL) {
        this.providers.set(1, new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL));
      }
      if (process.env.POLYGON_RPC_URL) {
        this.providers.set(137, new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL));
      }
      this.isConfigured = this.providers.size > 0;
    } catch (err) {
      console.warn('[crypto-service] Blockchain providers not initialized — RPC URLs not configured.');
      this.isConfigured = false;
    }
  }

  /**
   * Set up a crypto subscription for a customer
   */
  async setupCryptoSubscription(params: {
    customerId: string;
    tierId: string;
    walletAddress: string;
    stableCoin: 'USDC' | 'USDT' | 'DAI';
    chainId: number;
    billingPeriod: 'monthly' | 'annual';
  }): Promise<{ subscriptionId: string; smartContractAddress: string }> {
    try {
      // Get or deploy smart contract for this chain
      const contract = await this.getOrDeployContract(params.chainId);
      
      // Calculate subscription amount based on tier and billing period
      const subscriptionTier = await storage.getSubscriptionTier(params.tierId);
      if (!subscriptionTier) {
        throw new Error('Invalid subscription tier');
      }

      const amount = params.billingPeriod === 'monthly' 
        ? subscriptionTier.monthlyPrice 
        : subscriptionTier.annualPrice || subscriptionTier.monthlyPrice * 12;

      // Create subscription record
      const subscription = await storage.createCustomerSubscription({
        customerId: params.customerId,
        tierId: params.tierId,
        paymentMethod: 'crypto',
        walletAddress: params.walletAddress,
        smartContractAddress: contract.contractAddress,
        stableCoin: params.stableCoin,
        chainId: params.chainId,
        allowanceAmount: amount,
        nextBilling: new Date(Date.now() + (params.billingPeriod === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000)
      });

      await this.logCryptoEvent('subscription_setup', 'info', `Crypto subscription setup for customer ${params.customerId}`, {
        subscriptionId: subscription.id,
        walletAddress: params.walletAddress,
        stableCoin: params.stableCoin,
        chainId: params.chainId,
        amount: amount.toString()
      });

      return {
        subscriptionId: subscription.id,
        smartContractAddress: contract.contractAddress
      };

    } catch (error) {
      await this.logCryptoEvent('subscription_setup_error', 'error', `Failed to setup crypto subscription: ${error.message}`, {
        customerId: params.customerId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process automatic subscription renewal
   */
  async processSubscriptionRenewal(subscriptionId: string): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      const subscription = await storage.getCustomerSubscription(subscriptionId);
      if (!subscription || !subscription.autoRenew) {
        return { success: false, error: 'Subscription not found or auto-renewal disabled' };
      }

      // Check if renewal is due
      const now = new Date();
      if (!subscription.nextBilling || subscription.nextBilling > now) {
        return { success: false, error: 'Renewal not due yet' };
      }

      // Get contract instance
      const provider = this.providers.get(subscription.chainId!);
      if (!provider) {
        throw new Error(`No provider configured for chain ${subscription.chainId}`);
      }

      const contract = new ethers.Contract(
        subscription.smartContractAddress!,
        SUBSCRIPTION_CONTRACT_ABI,
        provider
      );

      // Check subscription status on-chain
      const subscriptionHash = ethers.keccak256(ethers.toUtf8Bytes(subscriptionId));
      const onChainSub = await contract.getSubscription(subscriptionHash);
      
      if (!onChainSub.active) {
        await storage.updateCustomerSubscription(subscriptionId, { status: 'expired' });
        return { success: false, error: 'Subscription expired on-chain' };
      }

      // Calculate renewal cost
      const renewalCost = await contract.calculateRenewalCost(subscriptionHash);

      // Check allowance and balance
      const stablecoinAddress = STABLECOIN_CONTRACTS[subscription.chainId!]?.[subscription.stableCoin!];
      if (!stablecoinAddress) {
        throw new Error(`Stablecoin ${subscription.stableCoin} not supported on chain ${subscription.chainId}`);
      }

      const erc20Contract = new ethers.Contract(
        stablecoinAddress,
        ['function allowance(address owner, address spender) view returns (uint256)', 'function balanceOf(address account) view returns (uint256)'],
        provider
      );

      const allowance = await erc20Contract.allowance(subscription.walletAddress, subscription.smartContractAddress);
      const balance = await erc20Contract.balanceOf(subscription.walletAddress);

      if (allowance < renewalCost) {
        await this.logCryptoEvent('renewal_insufficient_allowance', 'warning', `Insufficient allowance for renewal`, {
          subscriptionId,
          required: renewalCost.toString(),
          available: allowance.toString()
        });
        return { success: false, error: 'Insufficient allowance' };
      }

      if (balance < renewalCost) {
        await this.logCryptoEvent('renewal_insufficient_balance', 'warning', `Insufficient balance for renewal`, {
          subscriptionId,
          required: renewalCost.toString(),
          available: balance.toString()
        });
        return { success: false, error: 'Insufficient balance' };
      }

      // Process renewal transaction (this would be done by the smart contract automatically)
      // In a real implementation, this would be triggered by a cron job or event listener
      
      // Update subscription record
      const nextBilling = new Date(subscription.nextBilling);
      nextBilling.setMonth(nextBilling.getMonth() + 1); // Add one month for monthly subscriptions

      await storage.updateCustomerSubscription(subscriptionId, {
        lastPayment: now,
        nextBilling: nextBilling,
        status: 'active'
      });

      // Record payment transaction
      const payment = await storage.createCryptoPayment({
        subscriptionId,
        fromAddress: subscription.walletAddress!,
        toAddress: subscription.smartContractAddress!,
        amount: renewalCost,
        stableCoin: subscription.stableCoin!,
        chainId: subscription.chainId!,
        status: 'confirmed',
        paymentType: 'subscription_renewal',
        periodCovered: new Date().toISOString().slice(0, 7), // YYYY-MM format
        confirmedAt: now
      });

      await this.logCryptoEvent('subscription_renewed', 'info', `Subscription renewed successfully`, {
        subscriptionId,
        paymentId: payment.id,
        amount: renewalCost.toString(),
        nextBilling: nextBilling.toISOString()
      });

      return { success: true, transactionHash: 'auto-renewal-processed' };

    } catch (error) {
      await this.logCryptoEvent('renewal_error', 'error', `Subscription renewal failed: ${error.message}`, {
        subscriptionId,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Monitor blockchain for subscription payments
   */
  async monitorPayments(chainId: number, fromBlock: number = 0): Promise<void> {
    try {
      const provider = this.providers.get(chainId);
      if (!provider) {
        throw new Error(`No provider configured for chain ${chainId}`);
      }

      // Get all active smart contracts for this chain
      const contracts = await storage.getSmartContractsByChain(chainId);
      
      for (const contractInfo of contracts) {
        const contract = new ethers.Contract(
          contractInfo.contractAddress,
          SUBSCRIPTION_CONTRACT_ABI,
          provider
        );

        // Listen for subscription events
        const filter = contract.filters.SubscriptionRenewed();
        const events = await contract.queryFilter(filter, fromBlock);

        for (const event of events) {
          await this.processSubscriptionEvent(event, contractInfo);
        }

        // Update last checked block
        const latestBlock = await provider.getBlockNumber();
        await storage.updateSmartContract(contractInfo.id, { 
          lastBlockChecked: latestBlock 
        });
      }

    } catch (error) {
      await this.logCryptoEvent('monitoring_error', 'error', `Payment monitoring failed: ${error.message}`, {
        chainId,
        error: error.message
      });
    }
  }

  /**
   * Get subscription status and payment history
   */
  async getSubscriptionDetails(subscriptionId: string): Promise<{
    subscription: CustomerSubscription;
    payments: any[];
    onChainStatus?: any;
  }> {
    const subscription = await storage.getCustomerSubscription(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const payments = await storage.getCryptoPaymentsBySubscription(subscriptionId);

    let onChainStatus;
    if (subscription.smartContractAddress && subscription.chainId) {
      try {
        const provider = this.providers.get(subscription.chainId);
        if (provider) {
          const contract = new ethers.Contract(
            subscription.smartContractAddress,
            SUBSCRIPTION_CONTRACT_ABI,
            provider
          );
          
          const subscriptionHash = ethers.keccak256(ethers.toUtf8Bytes(subscriptionId));
          onChainStatus = await contract.getSubscription(subscriptionHash);
        }
      } catch (error) {
        console.warn('Failed to fetch on-chain status:', error.message);
      }
    }

    return {
      subscription,
      payments,
      onChainStatus
    };
  }

  private async getOrDeployContract(chainId: number): Promise<SmartContract> {
    // In a real implementation, this would check if we have a deployed contract
    // and deploy one if needed. For now, return a mock contract address
    const existingContract = await storage.getSmartContractByChain(chainId);
    if (existingContract) {
      return existingContract;
    }

    // Mock deployment - in production, this would deploy actual smart contract
    return await storage.createSmartContract({
      contractAddress: `0x${Math.random().toString(16).substr(2, 40)}`, // Mock address
      chainId,
      contractType: 'subscription_manager',
      version: '1.0.0',
      supportedStableCoins: ['USDC', 'USDT', 'DAI'],
      minimumPayment: 1,
      maximumPayment: 100000,
      gasLimit: 300000,
      abi: SUBSCRIPTION_CONTRACT_ABI
    });
  }

  private async processSubscriptionEvent(event: any, contractInfo: SmartContract): Promise<void> {
    // Process blockchain events and update database accordingly
    // This would handle SubscriptionCreated, SubscriptionRenewed, etc.
    console.log('Processing subscription event:', event.event, event.args);
  }

  private async logCryptoEvent(eventType: string, severity: string, message: string, details: any): Promise<void> {
    await storage.createAuditLog({
      eventType,
      severity,
      message,
      details,
      sourceSystem: 'crypto_service'
    });
  }
}

export const cryptoSubscriptionService = new CryptoSubscriptionService();