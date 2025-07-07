import React from 'react';
import { completeChecklistData } from '../../../complete-checklist-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, AlertTriangle, FileText, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FARCompliancePage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedArea, setSelectedArea] = React.useState('all');

  // Flatten the nested structure to get all items
  const allItems = completeChecklistData.flatMap(area => 
    area.items.map(item => ({
      ...item,
      areaTitle: area.title,
      areaId: area.id
    }))
  );

  // Filter checklist data based on search and area
  const filteredData = allItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.areaTitle.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesArea = selectedArea === 'all' || item.areaId === selectedArea;
    
    return matchesSearch && matchesArea;
  });

  // Get unique inspection areas for filter
  const inspectionAreas = completeChecklistData.map(area => ({
    id: area.id,
    title: area.title
  }));

  // Calculate compliance statistics
  const totalItems = allItems.length;
  const compliantItems = allItems.filter(item => item.status === 'compliant').length;
  const partialItems = allItems.filter(item => item.status === 'partial').length;
  const pendingItems = allItems.filter(item => item.status === 'pending').length;
  const complianceRate = Math.round((compliantItems / totalItems) * 100);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'non-compliant':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'non-compliant':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">
            FAA Part 142 Inspection Checklist
          </CardTitle>
          <CardDescription className="text-center text-lg">
            Complete 200-item authentic regulatory compliance checklist
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Compliance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Compliance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{complianceRate}%</div>
              <div className="text-sm text-gray-600">Overall Compliance</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{compliantItems}</div>
              <div className="text-sm text-gray-600">Compliant Items</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{partialItems}</div>
              <div className="text-sm text-gray-600">Partial Compliance</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600">{pendingItems}</div>
              <div className="text-sm text-gray-600">Pending Review</div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-gray-600">{complianceRate}%</span>
            </div>
            <Progress value={complianceRate} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search checklist items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-64">
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas ({totalItems} items)</SelectItem>
                  {inspectionAreas.map(area => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.title} ({completeChecklistData.find(a => a.id === area.id)?.items.length || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredData.length} of {totalItems} checklist items
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items */}
      <div className="space-y-4">
        {filteredData.map((item, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(item.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">
                      {item.number} - {item.description}
                    </h3>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {item.areaTitle}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getStatusColor(item.status)}`}
                      >
                        {item.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {item.reference && (
                <div className="mt-2 text-sm text-blue-600">
                  <strong>Reference:</strong> 14 CFR {item.reference}
                </div>
              )}

              {item.comments && (
                <div className="mt-2 text-sm text-gray-600">
                  <strong>Comments:</strong> {item.comments}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredData.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">No checklist items match your search criteria.</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setSelectedArea('all');
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}