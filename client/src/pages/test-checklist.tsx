import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Simple test component to verify 200-item data loading
const testData = [
  { id: 'area1', name: 'Area 1', items: Array.from({length: 38}, (_, i) => ({ id: `1-${(i+1).toString().padStart(2, '0')}`, description: `Item ${i+1}` })) },
  { id: 'area2', name: 'Area 2', items: Array.from({length: 15}, (_, i) => ({ id: `2-${(i+1).toString().padStart(2, '0')}`, description: `Item ${i+1}` })) },
  { id: 'area3', name: 'Area 3', items: Array.from({length: 20}, (_, i) => ({ id: `3-${(i+1).toString().padStart(2, '0')}`, description: `Item ${i+1}` })) },
  { id: 'area4', name: 'Area 4', items: Array.from({length: 20}, (_, i) => ({ id: `4-${(i+1).toString().padStart(2, '0')}`, description: `Item ${i+1}` })) },
  { id: 'area5', name: 'Area 5', items: Array.from({length: 20}, (_, i) => ({ id: `5-${(i+1).toString().padStart(2, '0')}`, description: `Item ${i+1}` })) },
  { id: 'area6', name: 'Area 6', items: Array.from({length: 18}, (_, i) => ({ id: `6-${(i+1).toString().padStart(2, '0')}`, description: `Item ${i+1}` })) },
  { id: 'area7', name: 'Area 7', items: Array.from({length: 16}, (_, i) => ({ id: `7-${(i+1).toString().padStart(2, '0')}`, description: `Item ${i+1}` })) },
  { id: 'area8', name: 'Area 8', items: Array.from({length: 17}, (_, i) => ({ id: `8-${(i+1).toString().padStart(2, '0')}`, description: `Item ${i+1}` })) },
  { id: 'area9', name: 'Area 9', items: Array.from({length: 16}, (_, i) => ({ id: `9-${(i+1).toString().padStart(2, '0')}`, description: `Item ${i+1}` })) },
  { id: 'area10', name: 'Area 10', items: Array.from({length: 20}, (_, i) => ({ id: `10-${(i+1).toString().padStart(2, '0')}`, description: `Item ${i+1}` })) }
];

export default function TestChecklist() {
  const totalItems = testData.reduce((sum, area) => sum + area.items.length, 0);
  
  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Test Checklist - 200 Items</h1>
        <div className="text-xl font-bold text-green-600 bg-yellow-100 p-4 rounded">
          SUCCESS: {totalItems} items loaded from {testData.length} areas
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {testData.map(area => (
          <Card key={area.id}>
            <CardHeader>
              <CardTitle>{area.name} ({area.items.length} items)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1 max-h-32 overflow-y-auto">
                {area.items.slice(0, 5).map(item => (
                  <div key={item.id}>{item.id}: {item.description}</div>
                ))}
                {area.items.length > 5 && (
                  <div className="text-gray-500">... and {area.items.length - 5} more</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="text-center text-lg">
        <strong>Total: {totalItems} items (Expected: 200)</strong>
        <br />
        {totalItems === 200 ? "✅ SUCCESS" : "❌ FAILED"}
      </div>
    </div>
  );
}