import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, Building2, CreditCard, Clock, CheckCircle, Search, Filter, Phone, Mail } from "lucide-react";

export default function FinanceMarketplace() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLoanType, setSelectedLoanType] = useState("");

  // Sample lenders data
  const lenders = [
    {
      id: "1",
      institutionName: "Aviation Capital Partners",
      lenderType: "Institutional",
      minimumLoan: 1000000,
      maximumLoan: 150000000,
      interestRateRange: "4.2% - 7.8%",
      loanTerms: ["60 months", "84 months", "120 months", "180 months"],
      aircraftTypes: ["Jets", "Turboprops", "Helicopters"],
      ratingScore: 4.8,
      contactInfo: { phone: "+1-555-0101", email: "lending@acp.com" }
    },
    {
      id: "2",
      institutionName: "First National Aviation Bank",
      lenderType: "Bank",
      minimumLoan: 500000,
      maximumLoan: 75000000,
      interestRateRange: "3.8% - 6.5%",
      loanTerms: ["36 months", "60 months", "84 months", "120 months"],
      aircraftTypes: ["Jets", "Turboprops", "Pistons"],
      ratingScore: 4.6,
      contactInfo: { phone: "+1-555-0202", email: "aviation@fnab.com" }
    },
    {
      id: "3",
      institutionName: "SkyBridge Credit Union",
      lenderType: "Credit Union",
      minimumLoan: 250000,
      maximumLoan: 25000000,
      interestRateRange: "3.2% - 5.9%",
      loanTerms: ["48 months", "72 months", "96 months"],
      aircraftTypes: ["Pistons", "Turboprops", "Light Jets"],
      ratingScore: 4.9,
      contactInfo: { phone: "+1-555-0303", email: "loans@skybridge.org" }
    },
    {
      id: "4",
      institutionName: "Global Aircraft Finance",
      lenderType: "Private",
      minimumLoan: 2000000,
      maximumLoan: 300000000,
      interestRateRange: "5.1% - 9.2%",
      loanTerms: ["72 months", "120 months", "180 months", "240 months"],
      aircraftTypes: ["Jets", "Commercial", "Helicopters"],
      ratingScore: 4.5,
      contactInfo: { phone: "+1-555-0404", email: "finance@gaf.com" }
    }
  ];

  // Sample finance applications data  
  const financeApplications = [
    {
      id: "1",
      aircraftTail: "N123AB",
      aircraftModel: "Gulfstream G650",
      lender: "Aviation Capital Partners",
      loanAmount: 45000000,
      loanTerm: 120,
      interestRate: 5.4,
      downPayment: 9000000,
      applicationStatus: "approved",
      creditScore: 785,
      appliedAt: "2025-07-15"
    },
    {
      id: "2",
      aircraftTail: "N456CD",
      aircraftModel: "Boeing 737-800", 
      lender: "Global Aircraft Finance",
      loanAmount: 85000000,
      loanTerm: 180,
      interestRate: 6.2,
      downPayment: 17000000,
      applicationStatus: "under_review",
      creditScore: 742,
      appliedAt: "2025-07-28"
    },
    {
      id: "3",
      aircraftTail: "N789EF",
      aircraftModel: "Cessna Citation X+",
      lender: "First National Aviation Bank",
      loanAmount: 18000000,
      loanTerm: 84,
      interestRate: 4.8,
      downPayment: 3600000,
      applicationStatus: "pending",
      creditScore: 698,
      appliedAt: "2025-07-30"
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "under_review": return "bg-yellow-100 text-yellow-800";
      case "pending": return "bg-blue-100 text-blue-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getLenderTypeColor = (type: string) => {
    switch (type) {
      case "Bank": return "bg-blue-100 text-blue-800";
      case "Credit Union": return "bg-green-100 text-green-800";
      case "Institutional": return "bg-purple-100 text-purple-800";
      case "Private": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Aviation Finance Marketplace</h1>
          <p className="text-slate-600 mt-2">Connect with lenders for aircraft financing solutions</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <CreditCard className="w-4 h-4 mr-2" />
          Apply for Financing
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
                <p className="text-sm font-medium text-slate-600">Origination Fees</p>
                <p className="text-2xl font-bold text-slate-900">$28.4M</p>
                <p className="text-sm text-green-600">+32% this quarter</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Loans Originated</p>
                <p className="text-2xl font-bold text-slate-900">$2.1B</p>
                <p className="text-sm text-blue-600">+45% YoY</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Partner Lenders</p>
                <p className="text-2xl font-bold text-slate-900">89</p>
                <p className="text-sm text-purple-600">Worldwide network</p>
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
                <p className="text-sm font-medium text-slate-600">Approval Rate</p>
                <p className="text-2xl font-bold text-slate-900">78%</p>
                <p className="text-sm text-orange-600">Industry leading</p>
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
            Find Lenders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Search lenders, loan amounts, or aircraft types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={selectedLoanType} onValueChange={setSelectedLoanType}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Lender Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="credit_union">Credit Union</SelectItem>
                <SelectItem value="institutional">Institutional</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lenders */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Partner Lenders</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lenders.map((lender) => (
            <Card key={lender.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{lender.institutionName}</CardTitle>
                  <Badge className={getLenderTypeColor(lender.lenderType)}>
                    {lender.lenderType}
                  </Badge>
                </div>
                <CardDescription>Rating: {lender.ratingScore}/5.0</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">Loan Range</p>
                      <p className="font-medium">{formatCurrency(lender.minimumLoan)} - {formatCurrency(lender.maximumLoan)}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Interest Rate</p>
                      <p className="font-medium text-green-600">{lender.interestRateRange}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Loan Terms:</p>
                    <div className="flex flex-wrap gap-1">
                      {lender.loanTerms.map((term) => (
                        <Badge key={term} variant="secondary" className="text-xs">
                          {term}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Aircraft Types:</p>
                    <div className="flex flex-wrap gap-1">
                      {lender.aircraftTypes.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4" />
                      {lender.contactInfo.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4" />
                      {lender.contactInfo.email}
                    </div>
                  </div>
                  <Button className="w-full">Get Pre-Qualified</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Finance Applications */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Finance Applications</h2>
        <div className="space-y-4">
          {financeApplications.map((application) => (
            <Card key={application.id}>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                  <div>
                    <p className="font-medium text-slate-900">{application.aircraftTail}</p>
                    <p className="text-sm text-slate-600">{application.aircraftModel}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{application.lender}</p>
                    <p className="text-sm text-slate-600">Credit Score: {application.creditScore}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Loan Amount</p>
                    <p className="font-medium text-slate-900">{formatCurrency(application.loanAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Interest Rate</p>
                    <p className="font-medium text-green-600">{application.interestRate}%</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{formatDate(application.appliedAt)}</span>
                    </div>
                    <Badge className={getStatusColor(application.applicationStatus)}>
                      {application.applicationStatus.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm">Details</Button>
                    <Button size="sm" variant="outline">Track</Button>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Down Payment: </span>
                      <span className="font-medium">{formatCurrency(application.downPayment)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Loan Term: </span>
                      <span className="font-medium">{application.loanTerm} months</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Monthly Payment: </span>
                      <span className="font-medium">
                        {formatCurrency(
                          (application.loanAmount * (application.interestRate / 100 / 12)) / 
                          (1 - Math.pow(1 + (application.interestRate / 100 / 12), -application.loanTerm))
                        )}
                      </span>
                    </div>
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