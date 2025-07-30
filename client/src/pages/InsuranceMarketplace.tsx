import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, DollarSign, Star, Phone, Mail, Search, Filter, Clock, CheckCircle } from "lucide-react";

export default function InsuranceMarketplace() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCoverage, setSelectedCoverage] = useState("");

  // Sample insurance providers and quotes data
  const insuranceProviders = [
    {
      id: "1",
      companyName: "Global Aviation Insurance",
      licenseNumber: "GAI-2024-001",
      ratingScore: 4.8,
      coverageTypes: ["Hull", "Liability", "Passenger", "War Risk"],
      contactInfo: { phone: "+1-555-0101", email: "quotes@globalavi.com" }
    },
    {
      id: "2", 
      companyName: "AeroProtect Insurance",
      licenseNumber: "API-2024-002",
      ratingScore: 4.6,
      coverageTypes: ["Hull", "Liability", "Cargo", "Ground Risk"],
      contactInfo: { phone: "+1-555-0202", email: "sales@aeroprotect.com" }
    },
    {
      id: "3",
      companyName: "SkyGuard Underwriters",
      licenseNumber: "SGU-2024-003", 
      ratingScore: 4.9,
      coverageTypes: ["Hull", "Liability", "Passenger", "Cargo", "War Risk"],
      contactInfo: { phone: "+1-555-0303", email: "underwriting@skyguard.com" }
    }
  ];

  const insuranceQuotes = [
    {
      id: "1",
      aircraftTail: "N123AB",
      aircraftModel: "Gulfstream G650",
      provider: "Global Aviation Insurance",
      coverageType: "Hull & Liability",
      coverageAmount: 75000000,
      annualPremium: 280000,
      deductible: 50000,
      validUntil: "2025-09-15",
      status: "active"
    },
    {
      id: "2",
      aircraftTail: "N456CD", 
      aircraftModel: "Boeing 737-800",
      provider: "SkyGuard Underwriters",
      coverageType: "Full Coverage",
      coverageAmount: 95000000,
      annualPremium: 420000,
      deductible: 75000,
      validUntil: "2025-08-30",
      status: "active"
    },
    {
      id: "3",
      aircraftTail: "N789EF",
      aircraftModel: "Cessna Citation X+",
      provider: "AeroProtect Insurance", 
      coverageType: "Hull & Liability",
      coverageAmount: 22500000,
      annualPremium: 95000,
      deductible: 25000,
      validUntil: "2025-10-20",
      status: "pending"
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric'
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Insurance Marketplace</h1>
          <p className="text-slate-600 mt-2">Find the best aviation insurance coverage for your aircraft</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Shield className="w-4 h-4 mr-2" />
          Request Quote
        </Button>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Commission Revenue</p>
                <p className="text-2xl font-bold text-slate-900">$12.4M</p>
                <p className="text-sm text-green-600">+18% this quarter</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Active Policies</p>
                <p className="text-2xl font-bold text-slate-900">2,847</p>
                <p className="text-sm text-blue-600">+134 this month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Partner Insurers</p>
                <p className="text-2xl font-bold text-slate-900">47</p>
                <p className="text-sm text-purple-600">Top rated globally</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Avg Savings</p>
                <p className="text-2xl font-bold text-slate-900">22%</p>
                <p className="text-sm text-orange-600">vs direct quotes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Find Insurance Quotes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Search aircraft, provider, or coverage type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={selectedCoverage} onValueChange={setSelectedCoverage}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Coverage Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hull">Hull Coverage</SelectItem>
                <SelectItem value="liability">Liability</SelectItem>
                <SelectItem value="passenger">Passenger</SelectItem>
                <SelectItem value="cargo">Cargo</SelectItem>
                <SelectItem value="war">War Risk</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Insurance Providers */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Featured Insurance Providers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {insuranceProviders.map((provider) => (
            <Card key={provider.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{provider.companyName}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium">{provider.ratingScore}</span>
                  </div>
                </div>
                <CardDescription>License: {provider.licenseNumber}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Coverage Types:</p>
                    <div className="flex flex-wrap gap-1">
                      {provider.coverageTypes.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4" />
                      {provider.contactInfo.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4" />
                      {provider.contactInfo.email}
                    </div>
                  </div>
                  <Button className="w-full">Get Quote</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Active Quotes */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Current Insurance Quotes</h2>
        <div className="space-y-4">
          {insuranceQuotes.map((quote) => (
            <Card key={quote.id}>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                  <div>
                    <p className="font-medium text-slate-900">{quote.aircraftTail}</p>
                    <p className="text-sm text-slate-600">{quote.aircraftModel}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{quote.provider}</p>
                    <p className="text-sm text-slate-600">{quote.coverageType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Coverage</p>
                    <p className="font-medium text-slate-900">{formatCurrency(quote.coverageAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Annual Premium</p>
                    <p className="font-medium text-green-600">{formatCurrency(quote.annualPremium)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">Valid until {formatDate(quote.validUntil)}</span>
                    </div>
                    <Badge 
                      variant={quote.status === "active" ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {quote.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm">Accept</Button>
                    <Button size="sm" variant="outline">Details</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}