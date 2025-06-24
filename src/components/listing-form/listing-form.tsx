
'use client';

import { useEffect, useState, useTransition, ChangeEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Info, Loader2, CheckCircle, AlertCircle, CalendarClock, UserCircle, Percent, UploadCloud, Trash2, FileImage, Lightbulb, FileText, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from '@/contexts/auth-context';
import { useListingsData } from '@/hooks/use-listings-data'; 

import { getSuggestedPriceAction, getSuggestedTitleAction, getGeneratedDescriptionAction } from '@/lib/actions/ai-actions';
import type { Listing, PriceSuggestionInput, PriceSuggestionOutput, LeaseTerm, SuggestListingTitleInput, SuggestListingTitleOutput, PricingModel, GenerateListingDescriptionInput, GenerateListingDescriptionOutput } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FREE_TIER_LISTING_LIMIT } from '@/lib/mock-data'; 
import { uploadListingImage } from '@/lib/storage';

import { db, firebaseInitializationError } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const amenitiesList = [
  { id: 'water hookup', label: 'Water Hookup' },
  { id: 'power access', label: 'Power Access' },
  { id: 'septic system', label: 'Septic System' },
  { id: 'road access', label: 'Road Access' },
  { id: 'fenced', label: 'Fenced' },
  { id: 'wifi available', label: 'Wi-Fi Available' },
  { id: 'pet friendly', label: 'Pet Friendly'},
  { id: 'lake access', label: 'Lake Access'},
  { id: 'fire pit', label: 'Fire Pit'},
];

const MAX_IMAGES = 5;
const MAX_FILE_SIZE_MB = 5;

const listingFormSchema = z.object({
  title: z.string({ required_error: "Title is required." }).min(3, { message: "Title must be at least 3 characters." }),
  description: z.string({ required_error: "Description is required." }).min(10, { message: "Description must be at least 10 characters." }),
  location: z.string({ required_error: "Location is required." }).min(3, { message: "Location is required." }),
  sizeSqft: z.coerce.number({ required_error: "Size is required.", invalid_type_error: "Size must be a number." }).positive({ message: "Size must be a positive number." }),
  price: z.coerce.number({ required_error: "Price is required.", invalid_type_error: "Price must be a number." }).positive({ message: "Price must be a positive number." }),
  pricingModel: z.enum(['nightly', 'monthly', 'lease-to-own'], { required_error: "Please select a pricing model."}),
  leaseToOwnDetails: z.string().optional(),
  amenities: z.array(z.string()).optional().default([]),
  images: z.array(z.string().url("Each image must be a valid URL.")).min(1, "Please upload at least one image."),
  leaseTerm: z.enum(['short-term', 'long-term', 'flexible']).optional(),
  minLeaseDurationMonths: z.coerce.number().int().positive().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.pricingModel === 'lease-to-own' && (!data.leaseToOwnDetails || data.leaseToOwnDetails.trim().length < 10)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Lease-to-Own details are required and must be at least 10 characters if 'Lease-to-Own' is selected.",
      path: ['leaseToOwnDetails'],
    });
  }
});

type ListingFormData = z.infer<typeof listingFormSchema>;
type ImagePreview = { url: string; isLoading: boolean; file?: File };

export function ListingForm() {
  const { currentUser, loading: authLoading, subscriptionStatus } = useAuth();
  const { myListings, isLoading: listingsDataLoading, refreshListings } = useListingsData();
  const { toast } = useToast();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<{ message: string, listingId?: string } | null>(null);
  
  const [isAiLoading, startAiTransition] = useTransition();

  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestionOutput | null>(null);
  const [titleSuggestion, setTitleSuggestion] = useState<SuggestListingTitleOutput | null>(null);
  const [descriptionSuggestion, setDescriptionSuggestion] = useState<GenerateListingDescriptionOutput | null>(null);
  
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  
  const [formSubmittedSuccessfully, setFormSubmittedSuccessfully] = useState(false);

  const form = useForm<ListingFormData>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      sizeSqft: 1000,
      price: 100,
      pricingModel: 'monthly',
      leaseToOwnDetails: '',
      amenities: [],
      images: [],
      leaseTerm: 'flexible',
      minLeaseDurationMonths: null,
    },
  });

  const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors } } = form;

  const watchedTitle = watch('title');
  const watchedDescription = watch('description');
  const watchedLocation = watch('location');
  const watchedSizeSqft = watch('sizeSqft');
  const watchedPrice = watch('price');
  const watchedAmenities = watch('amenities');
  const watchedLeaseTerm = watch('leaseTerm');
  const watchedPricingModel = watch('pricingModel');

  const isPremiumUser = subscriptionStatus === 'premium';
  const atListingLimit = !isPremiumUser && myListings.length >= FREE_TIER_LISTING_LIMIT;

  const handleSuggestPrice = async () => {
    setPriceSuggestion(null);
    const amenitiesString = watchedAmenities?.join(', ');
    const input: PriceSuggestionInput = { location: watchedLocation, sizeSqft: Number(watchedSizeSqft), amenities: amenitiesString || 'none' };
    if (!input.location || !input.sizeSqft || input.sizeSqft <= 0) {
        toast({ title: "Input Error", description: "Valid location and size needed for price suggestion.", variant: "destructive" }); return;
    }
    startAiTransition(async () => {
      const result = await getSuggestedPriceAction(input);
      if (result.data) {
        setPriceSuggestion(result.data);
        toast({ title: "Price Suggestion!", description: `Suggested: $${result.data.suggestedPrice.toFixed(0)}/month. You can set your actual price below.` });
      } else { toast({ title: "Suggestion Error", description: result.error, variant: "destructive" }); }
    });
  };

  const handleSuggestTitle = async () => {
    if (!isPremiumUser) {
      toast({ title: "Premium Feature", description: "AI Title Assistant is a premium feature. Upgrade to unlock.", action: <ToastAction altText="Upgrade" onClick={() => router.push('/pricing')}>Upgrade</ToastAction> });
      return;
    }
    setTitleSuggestion(null);
    const descriptionSnippet = watchedDescription.substring(0, 200); 
    const keywords = watchedAmenities?.slice(0,3).join(', ') + (descriptionSnippet ? `, ${descriptionSnippet.split(' ').slice(0,5).join(' ')}` : '');
    const input: SuggestListingTitleInput = { location: watchedLocation, sizeSqft: Number(watchedSizeSqft) || undefined, keywords: keywords || 'land for rent', existingDescription: descriptionSnippet };
    if (!input.location || !input.keywords) {
        toast({ title: "Input Error", description: "Location and keywords for title suggestion.", variant: "destructive" }); return;
    }
    startAiTransition(async () => {
      const result = await getSuggestedTitleAction(input);
      if (result.data) { setTitleSuggestion(result.data); toast({ title: "Title Suggestion!", description: `Suggested: "${result.data.suggestedTitle}".` }); }
      else { toast({ title: "Suggestion Error", description: result.error, variant: "destructive" }); }
    });
  };

  const handleSuggestDescription = async () => {
     if (!isPremiumUser) {
      toast({ title: "Premium Feature", description: "AI Description Generator is a premium feature. Upgrade to unlock.", action: <ToastAction altText="Upgrade" onClick={() => router.push('/pricing')}>Upgrade</ToastAction> });
      return;
    }
    setDescriptionSuggestion(null);
    const input: GenerateListingDescriptionInput = {
        listingTitle: watchedTitle, location: watchedLocation, sizeSqft: Number(watchedSizeSqft),
        amenities: watchedAmenities || [], pricingModel: watchedPricingModel, price: Number(watchedPrice),
        leaseTerm: watchedLeaseTerm || null, keywords: watchedAmenities?.join(', ')
    };
    if (!input.listingTitle || !input.location || !input.sizeSqft || !input.sizeSqft <= 0 || !input.pricingModel || !input.price || input.price <=0) {
        toast({ title: "Input Error", description: "Title, location, size, pricing model, and price needed for description.", variant: "destructive" }); return;
    }
    startAiTransition(async () => {
        const result = await getGeneratedDescriptionAction(input);
        if (result.data) { setDescriptionSuggestion(result.data); toast({ title: "Description Suggestion Ready!"}); }
        else { toast({ title: "Suggestion Error", description: result.error, variant: "destructive" }); }
    });
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to upload images.", variant: "destructive"});
      return;
    }
    setImageUploadError(null);
    const files = Array.from(event.target.files || []);

    if (imagePreviews.length + files.length > MAX_IMAGES) {
      setImageUploadError(`Cannot exceed ${MAX_IMAGES} images.`);
      return;
    }

    const newPreviews: ImagePreview[] = files.map(file => ({
        url: URL.createObjectURL(file),
        isLoading: true,
        file: file,
    }));
    setImagePreviews(prev => [...prev, ...newPreviews]);
    
    for (let i = 0; i < newPreviews.length; i++) {
        const preview = newPreviews[i];
        if (preview.file) {
            try {
                const downloadURL = await uploadListingImage(preview.file, currentUser.uid);
                setImagePreviews(prev => prev.map(p => p.url === preview.url ? { ...p, url: downloadURL, isLoading: false } : p));
                const currentImages = getValues('images');
                setValue('images', [...currentImages, downloadURL], { shouldDirty: true, shouldValidate: true });
            } catch (error) {
                console.error("Upload failed for a file:", error);
                setImagePreviews(prev => prev.filter(p => p.url !== preview.url));
                toast({ title: "Upload Failed", description: `Could not upload ${preview.file?.name}.`, variant: "destructive" });
            }
        }
    }
  };
  
  const handleRemoveImage = (indexToRemove: number) => {
    const newImagePreviews = imagePreviews.filter((_, i) => i !== indexToRemove);
    setImagePreviews(newImagePreviews);
    // Update the form value with only the URLs of the remaining images
    setValue('images', newImagePreviews.filter(p => !p.isLoading).map(p => p.url), { shouldDirty: true, shouldValidate: true });
  };
  
  const onSubmit = async (data: ListingFormData) => {
    if (authLoading || !currentUser?.uid) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" }); return;
    }
    if (atListingLimit) {
      toast({ title: "Listing Limit Reached", description: `Free accounts can only create ${FREE_TIER_LISTING_LIMIT} listing. Please upgrade to Premium.`, variant: "destructive", action: <ToastAction altText="Upgrade" onClick={() => router.push('/pricing')}>Upgrade</ToastAction> });
      return;
    }
    
    setIsSubmitting(true); setSubmissionError(null); setSubmissionSuccess(null); setFormSubmittedSuccessfully(false);
    try {
      const finalImageUrls = imagePreviews.filter(p => !p.isLoading).map(p => p.url);
      if(finalImageUrls.length === 0){
        throw new Error("Please upload at least one image.");
      }

      const newListingPayload = {
        ...data,
        images: finalImageUrls,
        landownerId: currentUser.uid,
        isAvailable: true,
        rating: undefined,
        numberOfRatings: 0,
        isBoosted: subscriptionStatus === 'premium',
        createdAt: Timestamp.fromDate(new Date()),
        leaseToOwnDetails: data.pricingModel === 'lease-to-own' ? data.leaseToOwnDetails : undefined,
        minLeaseDurationMonths: (data.leaseTerm !== 'flexible' && data.minLeaseDurationMonths && Number.isInteger(data.minLeaseDurationMonths) && data.minLeaseDurationMonths > 0) ? data.minLeaseDurationMonths : undefined,
      };
      
      const firestorePayload: any = {...newListingPayload};
      Object.keys(firestorePayload).forEach(key => {
        if (firestorePayload[key as keyof typeof firestorePayload] === undefined) {
          delete firestorePayload[key as keyof typeof firestorePayload];
        }
      });
      
      const docRef = await addDoc(collection(db, "listings"), firestorePayload);
      
      setSubmissionSuccess({ message: `Listing "${data.title}" created successfully!`, listingId: docRef.id });
      toast({ title: "Success!", description: `Listing "${data.title}" created!`, action: <ToastAction altText="View Listing" onClick={() => router.push(`/listings/${docRef.id}`)}>View</ToastAction> });
      form.reset(); 
      setImagePreviews([]); 
      setPriceSuggestion(null); 
      setTitleSuggestion(null); 
      setDescriptionSuggestion(null); 
      setFormSubmittedSuccessfully(true);
      refreshListings();
    } catch (error: any) {
      console.error("Error creating listing:", error);
      let errorMessage = error.message || "Failed to create listing. Please try again.";
      setSubmissionError(errorMessage); toast({ title: "Error Creating Listing", description: errorMessage, variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  if (authLoading || (!currentUser && subscriptionStatus === 'loading') || listingsDataLoading ) {
    return <div className="flex justify-center items-center min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading form...</p></div>;
  }
  if (!currentUser) {
    return <Card className="w-full max-w-2xl mx-auto"><CardHeader><CardTitle>Create New Land Listing</CardTitle></CardHeader><CardContent><Alert variant="destructive"><UserCircle className="h-4 w-4" /><AlertTitle>Login Required</AlertTitle><AlertDescription>You must be <Link href={`/login?redirect=${encodeURIComponent("/listings/new")}`} className="underline">logged in</Link>.</AlertDescription></Alert></CardContent></Card>;
  }
  
  const priceLabel = watchedPricingModel === 'nightly' ? "Price per Night ($)" : watchedPricingModel === 'monthly' ? "Price per Month ($)" : "Est. Monthly Payment ($) for LTO";
  const isActualSubmitButtonDisabled = isSubmitting || authLoading || !currentUser?.uid || atListingLimit || (firebaseInitializationError !== null && !currentUser.appProfile);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader><CardTitle>Create New Land Listing</CardTitle><CardDescription>Fill details to list your land on LandShare.</CardDescription></CardHeader>
      {atListingLimit && (
        <Alert variant="destructive" className="mx-6 mb-0">
            <Crown className="h-4 w-4 text-premium" />
            <AlertTitle>Listing Limit Reached</AlertTitle>
            <AlertDescription>
              Free accounts can create {FREE_TIER_LISTING_LIMIT} listing. <Button variant="link" asChild className="p-0 h-auto text-premium hover:text-premium/80"><Link href="/pricing">Upgrade to Premium</Link></Button> for unlimited listings.
            </AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6 pt-6">
          <div>
            <Label htmlFor="title">Listing Title</Label>
            <div className="flex items-center gap-2">
              <Input id="title" {...register('title')} aria-invalid={errors.title ? "true" : "false"} className="flex-grow" />
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleSuggestTitle}
                      disabled={isAiLoading || !watchedLocation || (firebaseInitializationError !== null && !currentUser?.appProfile)}
                      className={cn(!isPremiumUser && "opacity-70 cursor-not-allowed relative")}
                    >
                      {isAiLoading && titleSuggestion === null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4 text-yellow-500" />}
                       {!isPremiumUser && <Crown className="absolute -top-1 -right-1 h-3 w-3 text-premium fill-premium" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p>{isPremiumUser ? "Suggest Title with AI" : "AI Title Assistant (Premium Feature)"}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
            {titleSuggestion && <Alert className="mt-2"><Info className="h-4 w-4" /><AlertTitle>Suggested: "{titleSuggestion.suggestedTitle}"</AlertTitle><AlertDescription><p className="text-xs">{titleSuggestion.reasoning}</p><Button type="button" size="sm" variant="link" className="p-0 h-auto text-xs" onClick={() => setValue('title', titleSuggestion.suggestedTitle, {shouldDirty: true})}>Use</Button></AlertDescription></Alert>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
             <div className="flex items-center gap-2">
                <Textarea id="description" {...register('description')} rows={5} aria-invalid={errors.description ? "true" : "false"} className="flex-grow"/>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleSuggestDescription}
                        disabled={isAiLoading || !watchedTitle || !watchedLocation || !watchedSizeSqft || !watchedPrice || (firebaseInitializationError !== null && !currentUser.appProfile)}
                        className={cn(!isPremiumUser && "opacity-70 cursor-not-allowed relative")}
                        >
                        {isAiLoading && descriptionSuggestion === null ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-premium" />}
                        {!isPremiumUser && <Crown className="absolute -top-1 -right-1 h-3 w-3 text-premium fill-premium" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>{isPremiumUser ? "Generate Description with AI" : "AI Description Generator (Premium Feature)"}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
            </div>
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
            {descriptionSuggestion && <Alert className="mt-2"><Info className="h-4 w-4" /><AlertTitle>Suggested Description:</AlertTitle><AlertDescription><p className="text-xs whitespace-pre-line">{descriptionSuggestion.suggestedDescription}</p><Button type="button" size="sm" variant="link" className="p-0 h-auto text-xs" onClick={() => setValue('description', descriptionSuggestion.suggestedDescription, {shouldDirty: true})}>Use</Button></AlertDescription></Alert>}
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div><Label htmlFor="location">Location (City, State)</Label><Input id="location" {...register('location')} aria-invalid={errors.location ? "true" : "false"} />{errors.location && <p className="text-sm text-destructive mt-1">{errors.location.message}</p>}</div>
            <div><Label htmlFor="sizeSqft">Size (Square Feet)</Label><Input id="sizeSqft" type="number" {...register('sizeSqft')} aria-invalid={errors.sizeSqft ? "true" : "false"} />{errors.sizeSqft && <p className="text-sm text-destructive mt-1">{errors.sizeSqft.message}</p>}</div>
          </div>

          <div>
            <Label>Images (up to {MAX_IMAGES})</Label>
            <div className="mt-2">
              <label htmlFor="image-upload" className={cn("flex flex-col justify-center items-center p-6 border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors", imageUploadError ? "border-destructive" : "border-border")}>
                <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</span>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to {MAX_FILE_SIZE_MB}MB each</p>
                <Input id="image-upload" type="file" multiple accept="image/*" className="sr-only" onChange={handleFileChange} disabled={imagePreviews.length >= MAX_IMAGES} />
              </label>
            </div>
            {imageUploadError && <p className="text-sm text-destructive mt-1">{imageUploadError}</p>}
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square group">
                    <Image src={preview.url} alt={`Preview ${index + 1}`} fill className="object-cover rounded-md" sizes="100px"/>
                    {preview.isLoading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                    )}
                    {!preview.isLoading && (
                         <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={() => handleRemoveImage(index)}><Trash2 className="h-3 w-3" /><span className="sr-only">Remove image</span></Button>
                    )}
                  </div>
                ))}
                {imagePreviews.length < MAX_IMAGES && (<label htmlFor="image-upload" className="aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer hover:border-primary text-muted-foreground hover:text-primary transition-colors"><FileImage className="h-8 w-8"/><span className="text-xs mt-1">Add more</span></label>)}
            </div>
            {errors.images && <p className="text-sm text-destructive mt-1">{errors.images.message}</p>}
          </div>

          <div>
            <Label className="mb-2 block">Pricing Model</Label>
            <Controller name="pricingModel" control={control} render={({ field }) => (<RadioGroup onValueChange={(value) => { field.onChange(value); if(value !== 'lease-to-own') setValue('leaseToOwnDetails', '', {shouldDirty: true }); }} value={field.value} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 border rounded-md">
                    {(['nightly', 'monthly', 'lease-to-own'] as PricingModel[]).map(model => (<Label key={model} htmlFor={`pricing-${model}`} className={cn("flex items-center space-x-2 p-2 rounded-md border cursor-pointer hover:bg-accent/10 transition-colors", field.value === model && "bg-accent/20 border-accent ring-1 ring-accent")}><RadioGroupItem value={model} id={`pricing-${model}`} /><span className="capitalize">{model.replace('-', ' ')}</span></Label>))}
                </RadioGroup>)} />
            {errors.pricingModel && <p className="text-sm text-destructive mt-1">{errors.pricingModel.message}</p>}
          </div>
          
          {watchedPricingModel === 'lease-to-own' && (<div><Label htmlFor="leaseToOwnDetails">Lease-to-Own Details</Label><Textarea id="leaseToOwnDetails" {...register('leaseToOwnDetails')} rows={3} placeholder="Describe key terms, e.g., down payment, term length, purchase price, etc." aria-invalid={errors.leaseToOwnDetails ? "true" : "false"} />{errors.leaseToOwnDetails && <p className="text-sm text-destructive mt-1">{errors.leaseToOwnDetails.message}</p>}</div>)}

          <div>
            <Label htmlFor="price">{priceLabel}</Label>
            <div className="flex items-center gap-2">
              <Input id="price" type="number" {...register('price')} aria-invalid={errors.price ? "true" : "false"} className="flex-grow" />
              {watchedPricingModel !== 'lease-to-own' && (<Button type="button" variant="outline" size="icon" onClick={handleSuggestPrice} disabled={isAiLoading || !watchedLocation || !watchedSizeSqft || (watchedSizeSqft != null && watchedSizeSqft <= 0) || (firebaseInitializationError !== null && !currentUser.appProfile)} title="Suggest Price with AI (for monthly rates)"><Sparkles className="h-4 w-4 text-accent" /></Button>)}
            </div>
            {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
            {priceSuggestion && watchedPricingModel !== 'lease-to-own' && <Alert className="mt-2"><Info className="h-4 w-4" /><AlertTitle>AI Suggested: ${priceSuggestion.suggestedPrice.toFixed(0)}/month</AlertTitle><AlertDescription><p className="text-xs">{priceSuggestion.reasoning}</p><Button type="button" size="sm" variant="link" className="p-0 h-auto text-xs" onClick={() => setValue('price', parseFloat(priceSuggestion.suggestedPrice.toFixed(0)), {shouldDirty: true})}>Use</Button></AlertDescription></Alert>}
          </div>

          <div>
            <Label className="flex items-center mb-2"><CalendarClock className="h-4 w-4 mr-2 text-primary" /> Lease Term Options</Label>
            <Controller name="leaseTerm" control={control} render={({ field }) => (<RadioGroup onValueChange={(value) => { field.onChange(value); if (value === 'flexible') setValue('minLeaseDurationMonths', null, {shouldDirty: true}); }} value={field.value || 'flexible'} className="space-y-1 p-2 border rounded-md">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="short-term" id="term-short" /><Label htmlFor="term-short" className="font-normal">Short Term (&lt; 6 mo)</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="long-term" id="term-long" /><Label htmlFor="term-long" className="font-normal">Long Term (6+ mo)</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="flexible" id="term-flexible" /><Label htmlFor="term-flexible" className="font-normal">Flexible</Label></div>
                </RadioGroup>)} />
            {errors.leaseTerm && <p className="text-sm text-destructive mt-1">{errors.leaseTerm.message}</p>}
          </div>

          {watchedLeaseTerm && watchedLeaseTerm !== 'flexible' && (<div><Label htmlFor="minLeaseDurationMonths">Minimum Lease (Months)</Label><Input id="minLeaseDurationMonths" type="number" placeholder="e.g., 1, 6, 12" {...register('minLeaseDurationMonths')} aria-invalid={errors.minLeaseDurationMonths ? "true" : "false"} />{errors.minLeaseDurationMonths && <p className="text-sm text-destructive mt-1">{errors.minLeaseDurationMonths.message}</p>}</div>)}
          
           <div><Label>Amenities</Label><Controller name="amenities" control={control} render={({ field }) => (<div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2 p-4 border rounded-md">
                  {amenitiesList.map(amenity => (<div key={amenity.id} className="flex items-center space-x-2"><Checkbox id={`amenity-${amenity.id}`} checked={field.value?.includes(amenity.id)} onCheckedChange={checked => field.onChange(checked ? [...(field.value || []), amenity.id] : (field.value || []).filter(v => v !== amenity.id))} /><Label htmlFor={`amenity-${amenity.id}`} className="font-normal">{amenity.label}</Label></div>))}
                </div>)} />{errors.amenities && <p className="text-sm text-destructive mt-1">{errors.amenities.message}</p>}
          </div>
          <Alert variant="default" className="mt-4 bg-muted/40"><Percent className="h-4 w-4" /><AlertTitle className="text-sm font-medium">Service Fee</AlertTitle><AlertDescription className="text-xs">{subscriptionStatus === 'premium' ? "Premium: 0.49% on payouts." : "Free: 2% on payouts."}<Link href="/pricing" className="underline ml-1 hover:text-primary">Learn more.</Link></AlertDescription></Alert>
        </CardContent>
        <CardFooter className="flex justify-between items-center gap-2">
          <div></div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => {form.reset(); setImagePreviews([]); setPriceSuggestion(null); setTitleSuggestion(null); setDescriptionSuggestion(null); setFormSubmittedSuccessfully(false); setSubmissionError(null); setSubmissionSuccess(null);}} disabled={isSubmitting || isAiLoading}>Reset Form</Button>
            <Button type="submit" disabled={isActualSubmitButtonDisabled}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create Listing</Button>
          </div>
        </CardFooter>
      </form>
      {submissionSuccess?.listingId && formSubmittedSuccessfully && <div className="p-4"><Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-900/30"><CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" /><AlertTitle className="text-green-700 dark:text-green-300">Listing Created!</AlertTitle><AlertDescription className="text-green-600 dark:text-green-400">{submissionSuccess.message}<Button asChild variant="link" className="ml-2 p-0 h-auto text-green-700 dark:text-green-300"><Link href={`/listings/${submissionSuccess.listingId}`}>View Your Listing</Link></Button></AlertDescription></Alert></div>}
      {submissionError && <div className="p-4 mt-4"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error Creating Listing</AlertTitle><AlertDescription>{submissionError}</AlertDescription></Alert></div>}
    </Card>
  );
}
