'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Maximize, UtilityPole, Droplets, Trash2 } from 'lucide-react';

const amenitiesList = [
  { id: 'water', label: 'Water Hookup', icon: Droplets },
  { id: 'power', label: 'Power Access', icon: UtilityPole },
  { id: 'septic', label: 'Septic System', icon: Trash2 },
  { id: 'road_access', label: 'Road Access' },
  { id: 'fenced', label: 'Fenced' },
];

export function FilterPanel() {
  const [priceRange, setPriceRange] = useState<[number, number]>([50, 1000]);
  const [sizeRange, setSizeRange] = useState<[number, number]>([500, 10000]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const handleAmenityChange = (amenityId: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenityId)
        ? prev.filter(id => id !== amenityId)
        : [...prev, amenityId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle filter submission logic
    console.log({ priceRange, sizeRange, selectedAmenities });
  };

  return (
    <Card className="sticky top-20 shadow-md">
      <CardHeader>
        <CardTitle>Filter Listings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="price-range" className="flex items-center mb-2">
              <DollarSign className="h-4 w-4 mr-2 text-primary" /> Price Range ($/month)
            </Label>
            <Slider
              id="price-range"
              min={0}
              max={2000}
              step={50}
              value={[priceRange[0], priceRange[1]]}
              onValueChange={(value) => setPriceRange(value as [number, number])}
              className="mb-2"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>${priceRange[0]}</span>
              <span>${priceRange[1]}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="size-range" className="flex items-center mb-2">
              <Maximize className="h-4 w-4 mr-2 text-primary" /> Lot Size (sq ft)
            </Label>
            <Slider
              id="size-range"
              min={100}
              max={50000}
              step={100}
              value={[sizeRange[0], sizeRange[1]]}
              onValueChange={(value) => setSizeRange(value as [number, number])}
              className="mb-2"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{sizeRange[0].toLocaleString()}</span>
              <span>{sizeRange[1].toLocaleString()}</span>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Amenities</Label>
            <div className="space-y-2">
              {amenitiesList.map(amenity => (
                <div key={amenity.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`amenity-${amenity.id}`}
                    checked={selectedAmenities.includes(amenity.id)}
                    onCheckedChange={() => handleAmenityChange(amenity.id)}
                  />
                  <Label htmlFor={`amenity-${amenity.id}`} className="font-normal flex items-center">
                    {amenity.icon && <amenity.icon className="h-4 w-4 mr-2 text-muted-foreground" />}
                    {amenity.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <Button type="submit" className="w-full">Apply Filters</Button>
        </form>
      </CardContent>
    </Card>
  );
}
