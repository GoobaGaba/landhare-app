
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Info, Loader2, CheckCircle, AlertCircle, CalendarClock, UserCircle, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

import { getSuggestedPriceAction } from '@/lib/actions/ai-actions';
import { createListingAction, type ListingFormState } from '@/app/(app)/listings/new/actions';
import type { PriceSuggestionInput, PriceSuggestionOutput, LeaseTerm } from '@/lib/types';
import Link from 'next/link';

const amenitiesList = [
  { id: 'water', label: 'Water Hookup' },
  { id: 'power', label: 'Power Access' },
  { id: 'septic', label: 'Septic System' },
  { id: 'road_access', label: 'Road Access' },
  { id: 'fenced', label: 'Fenced' },
  { id: 'wifi', label: 'Wi-Fi Available' },
  { id: 'pet_friendly', label: 'Pet Friendly'},
  { id: 'lake_access', label: 'Lake Access'},
  { id: 'fire_pit', label: 'Fire Pit'},
];

const listingFormSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  description: z.string().min(20, { message: "Description must be at least 20 characters." }),
  location: z.string().min(3, { message: "Location is required." }),
  sizeSqft: z.coerce.number().positive({ message: "Size must be a positive number." }),
  pricePerMonth: z.coerce.number().positive({ message: "Price must be a positive number." }),
  amenities: z.array(z.string()).min(1, { message: "Select at least one amenity." }),
  leaseTerm: z.enum(['short-term', 'long-term', 'flexible']).optional(),
  minLeaseDurationMonths: z.coerce.number().int().positive().optional(),
  landownerId: z.string().min(1, "Landowner ID is required"), 
});

type ListingFormData = z.infer<typeof listingFormSchema>;

const initialFormState: ListingFormState = { message: '', success: false };

export function ListingForm() {
  const { currentUser, loading: authLoading, subscriptionStatus } = useAuth();
  const { toast } = useToast();
  const [formState, formAction] = useFormState(createListingAction, initialFormState);
  const [isPending, startTransition] = useTransition();
  
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestionOutput | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const isPremiumUser = subscriptionStatus === 'premium';


  const form = useForm<ListingFormData>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      sizeSqft: 1000,
      pricePerMonth: 100,
      amenities: [],
      leaseTerm: 'flexible',
      minLeaseDurationMonths: undefined,
      landownerId: currentUser?.uid || '', 
    },
  });

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = form;
  
  useEffect(() => {
    if (currentUser && !form.getValues('landownerId')) {
      setValue('landownerId', currentUser.uid);
    }
  }, [currentUser, setValue, form]);

  const watchedLocation = watch('location');
  const watchedSizeSqft = watch('sizeSqft');
  const watchedAmenities = watch('amenities');
  const watchedLeaseTerm = watch('leaseTerm');

  const handleSuggestPrice = async () => {
    setIsSuggestionLoading(true);
    setPriceSuggestion(null);
    setSuggestionError(null);

    const amenitiesString = watchedAmenities.join(', ');
    const input: PriceSuggestionInput = {
      location: watchedLocation,
      sizeSqft: Number(watchedSizeSqft),
      amenities: amenitiesString || 'none',
    };

    if (!input.location || !input.sizeSqft || input.sizeSqft <= 0) {
        toast({
            title: "Input Error",
            description: "Please provide a valid location and size to get a price suggestion.",
            variant: "destructive",
        });
        setIsSuggestionLoading(false);
        return;
    }

    const result = await getSuggestedPriceAction(input);
    setIsSuggestionLoading(false);

    if (result.data) {
      setPriceSuggestion(result.data);
      toast({
        title: "Price Suggestion Ready!",
        description: `Suggested price: $${result.data.suggestedPrice.toFixed(2)}/month.`,
      });
    } else if (result.error) {
      setSuggestionError(result.error);
       toast({
        title: "Suggestion Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (formState.message && !isPending) {
      toast({
        title: formState.success ? "Success!" : "Error",
        description: formState.message,
        variant: formState.success ? "default" : "destructive",
      });
      if (formState.success) {
        form.reset(); 
        if(currentUser) setValue('landownerId', currentUser.uid); 
        setPriceSuggestion(null); // Clear suggestion on successful submit
        setSuggestionError(null);
      }
    }
  }, [formState, toast, isPending, form, currentUser, setValue]);


  const onSubmit = (data: ListingFormData) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a listing.", variant: "destructive"});
      return;
    }
    if (data.landownerId !== currentUser.uid) {
        toast({ title: "Form Error", description: "Landowner ID mismatch. Please refresh.", variant: "destructive"});
        setValue('landownerId', currentUser.uid); 
        return;
    }
    
    // Placeholder: Check if free user has reached listing limit
    // if (subscriptionStatus === 'free') {
    //   // const userListingsCount = await getListingsByLandownerCount(currentUser.uid);
    //   // if (userListingsCount >= 1) { // Assuming 1 free listing limit
    //   //   toast({ title: "Listing Limit Reached", description: "Free accounts can only create 1 listing. Upgrade to Premium for unlimited listings.", variant: "destructive" });
    //   //   return;
    //   // }
    // }


    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'amenities' && Array.isArray(value)) {
        value.forEach(amenity => formData.append(key, amenity));
      } else if (key === 'minLeaseDurationMonths' && value === undefined && watchedLeaseTerm !== 'flexible') {
        // Don't append if undefined and term is not flexible
      }
       else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    startTransition(() => {
      formAction(formData);
    });
  };

  if (authLoading || subscriptionStatus === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading form...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Land Listing</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <UserCircle className="h-4 w-4" />
            <AlertTitle>Login Required</AlertTitle>
            <AlertDescription>
              You must be <Link href="/login" className="underline">logged in</Link> to create a new listing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Land Listing</CardTitle>
        <CardDescription>Fill in the details below to list your land on LandShare Connect.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register('landownerId')} />
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="title">Listing Title</Label>
            <Input id="title" {...register('title')} aria-invalid={errors.title ? "true" : "false"} />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} rows={5} aria-invalid={errors.description ? "true" : "false"} />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="location">Location (City, State)</Label>
              <Input id="location" {...register('location')} aria-invalid={errors.location ? "true" : "false"} />
              {errors.location && <p className="text-sm text-destructive mt-1">{errors.location.message}</p>}
            </div>
            <div>
              <Label htmlFor="sizeSqft">Size (Square Feet)</Label>
              <Input id="sizeSqft" type="number" {...register('sizeSqft')} aria-invalid={errors.sizeSqft ? "true" : "false"} />
              {errors.sizeSqft && <p className="text-sm text-destructive mt-1">{errors.sizeSqft.message}</p>}
            </div>
          </div>
          
          <div>
            <Label>Amenities</Label>
            <Controller
              name="amenities"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2 p-4 border rounded-md">
                  {amenitiesList.map((amenity) => (
                    <div key={amenity.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`amenity-${amenity.id}`}
                        checked={field.value?.includes(amenity.id)}
                        onCheckedChange={(checked) => {
                          return checked
                            ? field.onChange([...(field.value || []), amenity.id])
                            : field.onChange(
                                (field.value || []).filter(
                                  (value) => value !== amenity.id
                                )
                              );
                        }}
                      />
                      <Label htmlFor={`amenity-${amenity.id}`} className="font-normal">{amenity.label}</Label>
                    </div>
                  ))}
                </div>
              )}
            />
            {errors.amenities && <p className="text-sm text-destructive mt-1">{errors.amenities.message}</p>}
          </div>

           <div>
            <Label className="flex items-center mb-2">
                <CalendarClock className="h-4 w-4 mr-2 text-primary" /> Lease Term
            </Label>
            <Controller
                name="leaseTerm"
                control={control}
                render={({ field }) => (
                    <RadioGroup 
                        onValueChange={field.onChange} 
                        value={field.value}
                        className="space-y-1 p-2 border rounded-md"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="short-term" id="term-short" />
                            <Label htmlFor="term-short" className="font-normal">Short Term (&lt; 6 months)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="long-term" id="term-long" />
                            <Label htmlFor="term-long" className="font-normal">Long Term (6+ months)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="flexible" id="term-flexible" />
                            <Label htmlFor="term-flexible" className="font-normal">Flexible (No min/max)</Label>
                        </div>
                    </RadioGroup>
                )}
            />
            {errors.leaseTerm && <p className="text-sm text-destructive mt-1">{errors.leaseTerm.message}</p>}
          </div>

          {watchedLeaseTerm && watchedLeaseTerm !== 'flexible' && (
            <div>
              <Label htmlFor="minLeaseDurationMonths">Minimum Lease Duration (Months)</Label>
              <Input 
                id="minLeaseDurationMonths" 
                type="number" 
                {...register('minLeaseDurationMonths')} 
                aria-invalid={errors.minLeaseDurationMonths ? "true" : "false"}
              />
              {errors.minLeaseDurationMonths && <p className="text-sm text-destructive mt-1">{errors.minLeaseDurationMonths.message}</p>}
            </div>
          )}


          <div>
            <Label htmlFor="pricePerMonth">Price per Month ($)</Label>
            <Input id="pricePerMonth" type="number" {...register('pricePerMonth')} aria-invalid={errors.pricePerMonth ? "true" : "false"} />
            {errors.pricePerMonth && <p className="text-sm text-destructive mt-1">{errors.pricePerMonth.message}</p>}
          </div>

          <Alert variant="default" className="mt-4 bg-muted/40">
            <Percent className="h-4 w-4" />
            <AlertTitle className="text-sm font-medium">Service Fee Information</AlertTitle>
            <AlertDescription className="text-xs">
                LandShare Connect applies a service fee to successful bookings. 
                {isPremiumUser ? 
                " As a Premium member, you benefit from a reduced closing fee of 0.99% on your payouts." :
                " Free accounts are subject to a 3% closing fee on landowner payouts. Upgrade to Premium for lower fees and more benefits!" 
                }
                <Link href="/pricing" className="underline ml-1 hover:text-primary">Learn more.</Link>
            </AlertDescription>
          </Alert>

          <Card className="bg-secondary/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Sparkles className="text-accent h-5 w-5" /> AI Pricing Assistant</CardTitle>
              <CardDescription className="text-xs">Get an AI-powered price suggestion based on your land's details.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleSuggestPrice} 
                disabled={isSuggestionLoading || !watchedLocation || !watchedSizeSqft || watchedSizeSqft <= 0}
                className="w-full"
              >
                {isSuggestionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Suggest Price
              </Button>
              {priceSuggestion && (
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Suggested Price: ${priceSuggestion.suggestedPrice.toFixed(2)}/month</AlertTitle>
                  <AlertDescription>
                    <p className="font-medium">Reasoning:</p>
                    <p className="text-xs">{priceSuggestion.reasoning}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="link"
                      className="p-0 h-auto mt-1 text-accent"
                      onClick={() => setValue('pricePerMonth', priceSuggestion.suggestedPrice)}
                    >
                      Use this price
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              {suggestionError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{suggestionError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          <div>
            <Label htmlFor="images">Upload Images (Optional)</Label>
            <Input id="images" type="file" multiple disabled />
            <p className="text-xs text-muted-foreground mt-1">Image upload functionality is not fully implemented in this demo. Backend for storage needed.</p>
          </div>

          {formState.message && !formState.success && (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{formState.message}</AlertDescription>
              </Alert>
          )}
           {errors.landownerId && <p className="text-sm text-destructive mt-1">{errors.landownerId.message}</p>}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={() => {form.reset(); if(currentUser)setValue('landownerId', currentUser.uid); setPriceSuggestion(null); setSuggestionError(null);}} disabled={isPending}>Reset Form</Button>
          <Button type="submit" disabled={isPending || !currentUser}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Listing
          </Button>
        </CardFooter>
      </form>
      {formState.success && formState.listingId && (
        <div className="p-4">
          <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-900/30">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-700 dark:text-green-300">Listing Created!</AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-400">
              {formState.message} {/* Your listing ID is {formState.listingId}. */}
              <Button asChild variant="link" className="ml-2 p-0 h-auto text-green-700 dark:text-green-300">
                <Link href={`/listings/${formState.listingId}`}>View Your Listing</Link>
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </Card>
  );
}
