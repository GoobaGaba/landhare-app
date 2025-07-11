
'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Maximize, UtilityPole, Droplets, Trash2, CalendarClock, FilterX, ListChecks, Wifi, Waves, Flame, Dog, Map, SquareDashedBottom } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { LeaseTerm } from '@/lib/types';

const amenitiesList = [
  { id: 'water hookup', label: 'Water Hookup', icon: Droplets },
  { id: 'power access', label: 'Power Access', icon: UtilityPole },
  { id: 'septic system', label: 'Septic System', icon: Trash2 },
  { id: 'road access', label: 'Road Access', icon: Map },
  { id: 'fenced', label: 'Fenced', icon: SquareDashedBottom },
  { id: 'pet friendly', label: 'Pet Friendly', icon: Dog },
  { id: 'wifi available', label: 'Wi-Fi Available', icon: Wifi },
  { id: 'lake access', label: 'Lake Access', icon: Waves },
  { id: 'fire pit', label: 'Fire Pit', icon: Flame },
];

interface FilterPanelProps {
  priceRange: [number, number];
  setPriceRange: Dispatch<SetStateAction<[number, number]>>;
  sizeRange: [number, number];
  setSizeRange: Dispatch<SetStateAction<[number, number]>>;
  selectedAmenities: string[];
  setSelectedAmenities: Dispatch<SetStateAction<string[]>>;
  selectedLeaseTerm: LeaseTerm | 'any';
  setSelectedLeaseTerm: Dispatch<SetStateAction<LeaseTerm | 'any'>>;
  resetFilters: () => void;
  disabled?: boolean;
}

export function FilterPanel({
  priceRange,
  setPriceRange,
  sizeRange,
  setSizeRange,
  selectedAmenities,
  setSelectedAmenities,
  selectedLeaseTerm,
  setSelectedLeaseTerm,
  resetFilters,
  disabled = false,
}: FilterPanelProps) {
  const handleAmenityChange = (amenityId: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenityId)
        ? prev.filter(id => id !== amenityId)
        : [...prev, amenityId]
    );
  };

  return (
    <Card className="sticky top-24 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle>Filter Listings</CardTitle>
        <Button variant="ghost" size="sm" onClick={resetFilters} title="Reset all filters" disabled={disabled}>
          <FilterX className="h-4 w-4 mr-2" /> Clear
        </Button>
      </CardHeader>
      <CardContent>
        <fieldset disabled={disabled} className="space-y-6">
          <div>
            <Label htmlFor="price-range" className="flex items-center mb-2">
              <DollarSign className="h-4 w-4 mr-2 text-primary" /> Price Range ($/month)
            </Label>
            <Slider
              id="price-range"
              min={0}
              max={2000}
              step={50}
              value={priceRange}
              onValueChange={(value) => setPriceRange(value as [number, number])}
              className="mb-2"
              disabled={disabled}
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
              max={500000} 
              step={100}
              value={sizeRange}
              onValueChange={(value) => setSizeRange(value as [number, number])}
              className="mb-2"
              disabled={disabled}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{sizeRange[0].toLocaleString()}</span>
              <span>{sizeRange[1].toLocaleString()}</span>
            </div>
          </div>
          
          <div>
            <Label className="flex items-center mb-2">
                <CalendarClock className="h-4 w-4 mr-2 text-primary" /> Lease Term
            </Label>
            <RadioGroup 
                value={selectedLeaseTerm} 
                onValueChange={(value) => setSelectedLeaseTerm(value as LeaseTerm | 'any')}
                className="space-y-1"
                disabled={disabled}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="any" id="term-any" disabled={disabled} />
                <Label htmlFor="term-any" className="font-normal">Any</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="short-term" id="term-short" disabled={disabled}/>
                <Label htmlFor="term-short" className="font-normal">Short Term (&lt; 6 months)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="long-term" id="term-long" disabled={disabled}/>
                <Label htmlFor="term-long" className="font-normal">Long Term (6+ months)</Label>
              </div>
               <div className="flex items-center space-x-2">
                <RadioGroupItem value="flexible" id="term-flexible" disabled={disabled}/>
                <Label htmlFor="term-flexible" className="font-normal">Flexible</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="flex items-center mb-2">
                <ListChecks className="h-4 w-4 mr-2 text-primary" /> Amenities
            </Label>
            <div className="space-y-2">
              {amenitiesList.map(amenity => (
                <div key={amenity.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`amenity-${amenity.id}`}
                    checked={selectedAmenities.includes(amenity.id)}
                    onCheckedChange={() => handleAmenityChange(amenity.id)}
                    disabled={disabled}
                  />
                  <Label htmlFor={`amenity-${amenity.id}`} className="font-normal flex items-center">
                    {amenity.icon && <amenity.icon className="h-4 w-4 mr-2 text-muted-foreground" />}
                    {amenity.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </fieldset>
      </CardContent>
    </Card>
  );
}
