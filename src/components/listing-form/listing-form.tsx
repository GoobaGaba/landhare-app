
'use client';

import { useEffect, useState, useTransition, ChangeEvent } from 'react';
import { useFormState } from 'react-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Info, Loader2, CheckCircle, AlertCircle, CalendarClock, UserCircle, Percent, UploadCloud, Trash2, FileImage } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

import { getSuggestedPriceAction } from '@/lib/actions/ai-actions';
import { createListingAction, type ListingFormState } from '@/app/(app)/listings/new/actions';
import type { PriceSuggestionInput, PriceSuggestionOutput, LeaseTerm } from '@/lib/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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

const MAX_IMAGES = 5;
const MAX_FILE_SIZE_MB = 5;

const listingFormSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  description: z.string().min(20, { message: "Description must be at least 20 characters." }),
  location: z.string().min(3, { message: "Location is required." }),
  sizeSqft: z.coerce.number().positive({ message: "Size must be a positive number." }),
  pricePerMonth: z.coerce.number().positive({ message: "Price must be a positive number." }),
  amenities: z.array(z.string()).min(1, { message: "Select at least one amenity." }),
  images: z.array(z.string().url("Each image must be a valid URL.")).optional().default([]), // Expecting URLs
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

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);


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
      images: [],
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
        setPriceSuggestion(null);
        setSuggestionError(null);
        setSelectedFiles([]);
        setImagePreviews([]);
        setImageUploadError(null);
      }
    }
  }, [formState, toast, isPending, form, currentUser, setValue]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImageUploadError(null);
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      if (selectedFiles.length + newFiles.length > MAX_IMAGES) {
        setImageUploadError(`You can upload a maximum of ${MAX_IMAGES} images.`);
        return;
      }

      const validFiles: File[] = [];
      const previews: string[] = [];

      newFiles.forEach(file => {
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          setImageUploadError(`File "${file.name}" is too large (max ${MAX_FILE_SIZE_MB}MB).`);
          return;
        }
        if (!file.type.startsWith('image/')) {
          setImageUploadError(`File "${file.name}" is not a valid image type.`);
          return;
        }
        validFiles.push(file);
        previews.push(URL.createObjectURL(file));
      });

      setSelectedFiles(prev => [...prev, ...validFiles]);
      setImagePreviews(prev => [...prev, ...previews]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      // Revoke object URL for the removed image to free memory
      if (imagePreviews[index]) {
        URL.revokeObjectURL(imagePreviews[index]);
      }
      return newPreviews;
    });
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);


  const onSubmit = async (data: ListingFormData) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a listing.", variant: "destructive"});
      return;
    }
    if (data.landownerId !== currentUser.uid) {
        toast({ title: "Form Error", description: "Landowner ID mismatch. Please refresh.", variant: "destructive"});
        setValue('landownerId', currentUser.uid);
        return;
    }

    const formDataToSubmit = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'amenities' && Array.isArray(value)) {
        value.forEach(amenity => formDataToSubmit.append(key, amenity));
      } else if (key === 'minLeaseDurationMonths' && (value === undefined || value === null) && watchedLeaseTerm !== 'flexible') {
        // Don't append if undefined/null and term is not flexible
      } else if (key === 'images') {
        // **IMPORTANT**: This is a placeholder section for image handling.
        // In a real app, you would upload files to Firebase Storage *client-side*
        // get their download URLs, and then pass those URLs in the 'images' array.
        // Server Actions are not ideal for direct file uploads from FormData without
        // more complex stream handling or dedicated API routes.
        // For now, we'll pass an empty array or mock URLs if you had them.
        // setValue('images', ['mock-url-1.jpg']); // Example if you had URLs
        // The 'data.images' will be an empty array by default from the schema if not set.
        (data.images || []).forEach(imgUrl => formDataToSubmit.append(key, imgUrl));

      } else if (value !== undefined && value !== null) {
        formDataToSubmit.append(key, String(value));
      }
    });
    
    toast({
        title: "Image Upload Note",
        description: "Image upload UI is for demonstration. Actual file uploads and URL generation for listings require separate implementation (e.g., client-side upload to Firebase Storage before submitting this form).",
        duration: 7000,
    });


    startTransition(() => {
      formAction(formDataToSubmit);
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
            <Label>Images (up to {MAX_IMAGES})</Label>
            <div className="mt-2">
              <label
                htmlFor="image-upload"
                className={cn(
                  "flex justify-center items-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer hover:border-primary",
                  imageUploadError ? "border-destructive" : "border-border"
                )}
              >
                <div className="space-y-1 text-center">
                  <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" />
                  <div className="flex text-sm text-muted-foreground">
                    <span className="text-primary font-medium">Upload files</span>
                    <Input id="image-upload" type="file" multiple accept="image/*" className="sr-only" onChange={handleFileChange} disabled={selectedFiles.length >= MAX_IMAGES} />
                  </div>
                  <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to {MAX_FILE_SIZE_MB}MB each</p>
                </div>
              </label>
            </div>
            {imageUploadError && <p className="text-sm text-destructive mt-1">{imageUploadError}</p>}
            {imagePreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {imagePreviews.map((previewUrl, index) => (
                  <div key={index} className="relative aspect-square group">
                    <Image src={previewUrl} alt={`Preview ${index + 1}`} fill className="object-cover rounded-md" sizes="100px"/>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sr-only">Remove image</span>
                    </Button>
                  </div>
                ))}
                {selectedFiles.length < MAX_IMAGES && (
                  <label htmlFor="image-upload" className="aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer hover:border-primary text-muted-foreground hover:text-primary">
                    <FileImage className="h-8 w-8"/>
                    <span className="text-xs mt-1">Add more</span>
                  </label>
                )}
              </div>
            )}
            <Alert variant="default" className="mt-2">
              <Info className="h-4 w-4" />
              <AlertTitle className="text-sm">Image Handling Note</AlertTitle>
              <AlertDescription className="text-xs">
                This form demonstrates image selection. Actual image uploads to cloud storage (like Firebase Storage) and saving their URLs would need to be implemented. The server action currently expects an array of image URLs.
              </AlertDescription>
            </Alert>
            {errors.images && <p className="text-sm text-destructive mt-1">{errors.images.message}</p>}
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
                {subscriptionStatus === 'premium' ?
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
          <Button variant="outline" type="button" onClick={() => {form.reset(); if(currentUser)setValue('landownerId', currentUser.uid); setPriceSuggestion(null); setSuggestionError(null); setSelectedFiles([]); setImagePreviews([]); setImageUploadError(null);}} disabled={isPending}>Reset Form</Button>
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
              {formState.message}
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
