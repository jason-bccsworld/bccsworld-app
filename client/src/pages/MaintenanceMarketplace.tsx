import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, MapPin, Star, Clock, DollarSign, Calendar, CheckCircle, Search, Filter, Phone } from "lucide-react";

export default function MaintenanceMarketplace() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedService, setSelectedService] = useState("");

  // Sample maintenance providers data
  const maintenanceProviders = [
    {
      id: "1",
      companyName: "Elite Aviation Services", 
      certificationNumber: "EAS-145-001",
      serviceTypes: ["Annual Inspection", "100-Hour", "Engine Overhaul", "Avionics"],
      location: "Miami, FL",
      ratingScore: 4.9,
      hourlyRate: 125,
      contactInfo: { phone: "+1-305-555-0101" }
    },
    {
      id: "2",
      companyName: "Precision Aircraft Maintenance",
      certificationNumber: "PAM-145-002", 
      serviceTypes: ["Line Maintenance", "Heavy Maintenance", "Modifications", "Paint"],
      location: "Dallas, TX",
      ratingScore: 4.7,
      hourlyRate: 110,
      contactInfo: { phone: "+1-214-555-0202" }
    },
    {
      id: "3",
      companyName: "AeroTech Solutions",
      certificationNumber: "ATS-145-003",
      serviceTypes: ["Engine Repair", "Propeller", "Landing Gear", "Hydraulics"],
      location: "Phoenix, AZ", 
      ratingScore: 4.8,
      hourlyRate: 135,
      contactInfo: { phone: "+1-602-555-0303" }
    },
    {
      id: "4",
      companyName: "Global Aircraft Services",
      certificationNumber: "GAS-145-004",
      serviceTypes: ["Annual Inspection", "Avionics Upgrade", "Interior Refurb", "Paint"],
      location: "Los Angeles, CA",
      ratingScore: 4.6,
      hourlyRate: 140,
      contactInfo: { phone: "+1-323-555-0404" }
    }
  ];

  // Sample maintenance services data
  const maintenanceServices = [
    {
      id: "1",
      aircraftTail: "N123AB",
      aircraftModel: "Gulfstream G650",
      provider: "Elite Aviation Services",
      serviceType: "Annual Inspection",
      scheduledDate: "2025-08-15",
      estimatedCost: 85000,
      status: "scheduled",
      description: "Comprehensive annual inspection including systems checks and documentation review"
    },
    {
      id: "2", 
      aircraftTail: "N456CD",
      aircraftModel: "Boeing 737-800",
      provider: "Precision Aircraft Maintenance", 
      serviceType: "Heavy Maintenance",
      scheduledDate: "2025-09-01",
      estimatedCost: 425000,
      status: "in_progress",
      description: "C-Check maintenance including structural inspections and component replacements"
    },
    {
      id: "3",
      aircraftTail: "N789EF", 
      aircraftModel: "Cessna Citation X+",
      provider: "AeroTech Solutions",
      serviceType: "Engine Overhaul",
      scheduledDate: "2025-08-30",
      estimatedCost: 195000,
      status: "scheduled",
      description: "Complete engine overhaul including teardown, inspection, and rebuild"
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
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Maintenance Marketplace</h1>
          <p className="text-slate-600 mt-2">Connect with certified maintenance providers worldwide</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Wrench className="w-4 h-4 mr-2" />
          Request Service
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
                <p className="text-sm font-medium text-slate-600">Transaction Fees</p>
                <p className="text-2xl font-bold text-slate-900">$18.6M</p>
                <p className="text-sm text-green-600">+25% this quarter</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Active Services</p>
                <p className="text-2xl font-bold text-slate-900">1,234</p>
                <p className="text-sm text-blue-600">+89 this week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Certified Providers</p>
                <p className="text-2xl font-bold text-slate-900">127</p>
                <p className="text-sm text-purple-600">Global network</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Avg Completion</p>
                <p className="text-2xl font-bold text-slate-900">12 days</p>
                <p className="text-sm text-orange-600">15% faster</p>
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
            Find Maintenance Providers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Search providers, services, or locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Service Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">Annual Inspection</SelectItem>
                <SelectItem value="100hour">100-Hour Inspection</SelectItem>
                <SelectItem value="engine">Engine Overhaul</SelectItem>
                <SelectItem value="avionics">Avionics</SelectItem>
                <SelectItem value="paint">Paint & Interior</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Providers */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Certified Maintenance Providers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {maintenanceProviders.map((provider) => (
            <Card key={provider.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{provider.companyName}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium">{provider.ratingScore}</span>
                  </div>
                </div>
                <CardDescription>Cert: {provider.certificationNumber}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4" />
                    {provider.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <DollarSign className="w-4 h-4" />
                    ${provider.hourlyRate}/hour
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4" />
                    {provider.contactInfo.phone}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Services:</p>
                    <div className="flex flex-wrap gap-1">
                      {provider.serviceTypes.map((service) => (
                        <Badge key={service} variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full">Request Quote</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Active Maintenance Services */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Scheduled Maintenance Services</h2>
        <div className="space-y-4">
          {maintenanceServices.map((service) => (
            <Card key={service.id}>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                  <div>
                    <p className="font-medium text-slate-900">{service.aircraftTail}</p>
                    <p className="text-sm text-slate-600">{service.aircraftModel}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{service.provider}</p>
                    <p className="text-sm text-slate-600">{service.serviceType}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{formatDate(service.scheduledDate)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Estimated Cost</p>
                    <p className="font-medium text-green-600">{formatCurrency(service.estimatedCost)}</p>
                  </div>
                  <div>
                    <Badge className={getStatusColor(service.status)}>
                      {service.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm">Details</Button>
                    <Button size="sm" variant="outline">Track</Button>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">{service.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}