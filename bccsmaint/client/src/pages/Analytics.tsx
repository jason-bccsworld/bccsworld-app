import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, Clock, Target } from 'lucide-react';

async function fetchCostAnalysis() {
  const response = await fetch('/api/analytics/costs');
  if (!response.ok) throw new Error('Failed to fetch cost analysis');
  return response.json();
}

function Analytics() {
  const { data: costAnalysis, isLoading } = useQuery({
    queryKey: ['cost-analysis'],
    queryFn: fetchCostAnalysis,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Analytics & ROI
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive cost analysis and predictive maintenance ROI metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${costAnalysis?.totalSavings?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              This fiscal year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costAnalysis?.roi}%</div>
            <p className="text-xs text-muted-foreground">
              Return on investment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prevented Downtime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costAnalysis?.preventedDowntime}</div>
            <p className="text-xs text-muted-foreground">
              Hours saved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Early Detection</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costAnalysis?.earlyDetection}</div>
            <p className="text-xs text-muted-foreground">
              Issues prevented
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Traditional vs Predictive Maintenance Costs</CardTitle>
          <CardDescription>
            Monthly comparison showing cost savings through AI-powered predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costAnalysis?.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
              <Bar dataKey="traditional" fill="#ef4444" name="Traditional Maintenance" />
              <Bar dataKey="predictive" fill="#22c55e" name="Predictive Maintenance" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Savings Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Savings Trend</CardTitle>
          <CardDescription>
            Cumulative savings achieved through predictive maintenance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={costAnalysis?.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Savings']} />
              <Line 
                type="monotone" 
                dataKey="savings" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ROI Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>ROI Breakdown</CardTitle>
            <CardDescription>
              Return on investment analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Platform Investment:</span>
              <span className="font-semibold">$125,000</span>
            </div>
            <div className="flex justify-between">
              <span>Annual Savings:</span>
              <span className="font-semibold text-green-600">$425,000</span>
            </div>
            <div className="flex justify-between">
              <span>Payback Period:</span>
              <span className="font-semibold">{costAnalysis?.paybackPeriod} months</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span>Net ROI:</span>
              <span className="font-bold text-blue-600">{costAnalysis?.roi}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Value Drivers</CardTitle>
            <CardDescription>
              Key contributors to cost savings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Prevented Downtime:</span>
                <span className="font-semibold">$185,000</span>
              </div>
              <div className="flex justify-between">
                <span>Early Detection:</span>
                <span className="font-semibold">$125,000</span>
              </div>
              <div className="flex justify-between">
                <span>Optimized Scheduling:</span>
                <span className="font-semibold">$85,000</span>
              </div>
              <div className="flex justify-between">
                <span>Parts Optimization:</span>
                <span className="font-semibold">$30,000</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Analytics;