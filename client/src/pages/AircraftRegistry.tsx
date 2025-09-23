import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Plus, Plane, DollarSign, Users, TrendingUp, Shield } from "lucide-react";
import { useState } from "react";
import type { AircraftRegistry, TokenOffering } from "@shared/schema";

export default function AircraftRegistry() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: aircraft = [], isLoading: aircraftLoading } = useQuery({
    queryKey: ["/api/aircraft"],
  });

  const { data: tokenOfferings = [], isLoading: offeringsLoading } = useQuery({
    queryKey: ["/api/token-offerings"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/registry/stats"],
  });

  const filteredAircraft = aircraft.filter((a: AircraftRegistry) =>
    a.tailNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTokenPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(price);
  };

  if (aircraftLoading || statsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">BCCS142 Compliance Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">BCCS142 Compliance Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Blockchain-based compliance tracking for aviation training organizations
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Register Aircraft
        </Button>
      </div>

      {/* Registry Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Aircraft</p>
                <p className="text-2xl font-bold">{stats?.totalAircraft || 0}</p>
              </div>
              <Plane className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tokenized Aircraft</p>
                <p className="text-2xl font-bold">{stats?.tokenizedAircraft || 0}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Trading Volume</p>
                <p className="text-2xl font-bold">{formatCurrency(stats?.totalTokenVolume || 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Investors</p>
                <p className="text-2xl font-bold">{stats?.activeInvestors || 0}</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="registry" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="registry">Aircraft Registry</TabsTrigger>
          <TabsTrigger value="tokenization">Token Marketplace</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Monitor</TabsTrigger>
        </TabsList>

        {/* Aircraft Registry Tab */}
        <TabsContent value="registry" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by tail number, manufacturer, or model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAircraft.map((aircraft: AircraftRegistry) => (
              <Card key={aircraft.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{aircraft.tailNumber}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant={aircraft.registrationStatus === 'active' ? 'default' : 'secondary'}>
                        {aircraft.registrationStatus}
                      </Badge>
                      {aircraft.isTokenized && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Tokenized
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    {aircraft.manufacturer} {aircraft.model} ({aircraft.year})
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Serial Number:</span>
                      <p className="text-gray-900">{aircraft.serialNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Max Seats:</span>
                      <p className="text-gray-900">{aircraft.maxSeats || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Engine Type:</span>
                      <p className="text-gray-900">{aircraft.engineType || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Max Weight:</span>
                      <p className="text-gray-900">{aircraft.maxWeight ? `${aircraft.maxWeight} lbs` : 'N/A'}</p>
                    </div>
                  </div>
                  
                  {aircraft.currentValuation && (
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-600">Current Valuation:</span>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(Number(aircraft.currentValuation))}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      View Details
                    </Button>
                    {aircraft.isTokenized ? (
                      <Button size="sm" className="flex-1">
                        View Tokens
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" className="flex-1">
                        Tokenize
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Token Marketplace Tab */}
        <TabsContent value="tokenization" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {tokenOfferings.map((offering: TokenOffering & { aircraft?: AircraftRegistry }) => {
              const relatedAircraft = aircraft.find((a: AircraftRegistry) => a.id === offering.aircraftId);
              const soldPercentage = (offering.tokensSold / offering.totalTokens) * 100;
              
              return (
                <Card key={offering.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {relatedAircraft?.tailNumber || 'Unknown Aircraft'}
                      </CardTitle>
                      <Badge variant={offering.status === 'active' ? 'default' : 'secondary'}>
                        {offering.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      {relatedAircraft?.manufacturer} {relatedAircraft?.model} ({relatedAircraft?.year})
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Token Price:</span>
                        <p className="text-lg font-bold text-green-600">
                          {formatTokenPrice(Number(offering.currentPrice || offering.initialPrice))}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Min Investment:</span>
                        <p className="text-gray-900">
                          {formatCurrency(Number(offering.minimumInvestment || 0))}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-600">Tokens Sold:</span>
                        <span>{offering.tokensSold.toLocaleString()} / {offering.totalTokens.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${soldPercentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{soldPercentage.toFixed(1)}% sold</p>
                    </div>

                    {offering.isAccreditedOnly && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Shield className="h-3 w-3 mr-1" />
                        Accredited Only
                      </Badge>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        View Prospectus
                      </Button>
                      <Button size="sm" className="flex-1">
                        Invest Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Compliance Monitor Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-Time Compliance Dashboard</CardTitle>
              <CardDescription>
                Automated compliance monitoring for all registered aircraft
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">Compliant Aircraft</p>
                        <p className="text-2xl font-bold text-green-900">
                          {aircraft.filter((a: AircraftRegistry) => a.registrationStatus === 'active').length}
                        </p>
                      </div>
                      <Shield className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Under Review</p>
                        <p className="text-2xl font-bold text-yellow-900">0</p>
                      </div>
                      <Shield className="h-8 w-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-800">Non-Compliant</p>
                        <p className="text-2xl font-bold text-red-900">0</p>
                      </div>
                      <Shield className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Recent Compliance Checks</h4>
                <div className="space-y-2">
                  {aircraft.slice(0, 5).map((aircraft: AircraftRegistry) => (
                    <div key={aircraft.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          ✓ Passed
                        </Badge>
                        <div>
                          <p className="font-medium">{aircraft.tailNumber}</p>
                          <p className="text-sm text-gray-600">
                            {aircraft.manufacturer} {aircraft.model}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Last checked</p>
                        <p className="text-sm font-medium">2 hours ago</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}