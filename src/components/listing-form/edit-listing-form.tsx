
'use client';

import { useEffect, useState, useTransition, ChangeEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type heic2any from 'heic2any'; // Import type only
import { useMapsLibrary } from '@vis.gl/react-google-maps';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Info, Loader2, CheckCircle, AlertCircle, CalendarClock, Percent, UploadCloud, Trash2, FileImage, Lightbulb, ArrowLeft, FileText, Crown, MapPin } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from '@/contexts/auth-context';
import { useListingsData } from '@/hooks/use-listings-data';
import { uploadListingImage } from '@/lib/storage';
import { firebaseInitializationError, db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

import { getSuggestedPriceAction, getSuggestedTitleAction, getGeneratedDescriptionAction } from '@/lib/actions/ai-actions';
import type { Listing, PriceSuggestionInput, PriceSuggestionOutput, LeaseTerm, SuggestListingTitleInput, SuggestListingTitleOutput, PricingModel, GenerateListingDescriptionInput, GenerateListingDescriptionOutput } from '@/lib/types';
import { cn } from '@/lib/utils';


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

const MAX_IMAGES = 10; // Premium users can upload more
const MAX_IMAGES_FREE = 5;
const MAX_FILE_SIZE_MB = 5;

const editListingFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  location: z.string().min(3, "Location is required."),
  lat: z.number().optional(),
  lng: z.number().optional(),
  sizeSqft: z.coerce.number().positive("Size must be a positive number."),
  price: z.coerce.number().positive("Price must be a positive number."),
  pricingModel: z.enum(['nightly', 'monthly', 'lease-to-own']),
  leaseToOwnDetails: z.string().optional(),
  downPayment: z.coerce.number().positive("Down payment must be a positive number.").optional(),
  amenities: z.array(z.string()).optional().default([]),
  images: z.array(z.string().url("Image URL invalid or missing.")).min(1, "Please upload at least one image."),
  leaseTerm: z.enum(['short-term', 'long-term', 'flexible']).optional(),
  minLeaseDurationMonths: z.coerce.number().int().positive().optional().nullable(),
  isAvailable: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.pricingModel === 'lease-to-own' && (!data.leaseToOwnDetails || data.leaseToOwnDetails.trim().length < 10)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Lease-to-Own details are required and must be at least 10 characters if 'Lease-to-Own' is selected.",
      path: ['leaseToOwnDetails'],
    });
  }
});

type EditListingFormData = z.infer<typeof editListingFormSchema>;
type ImagePreview = { url: string; isLoading: boolean; file?: File | Blob };

interface EditListingFormProps {
  listing: Listing;
  currentUserId: string;
}

export function EditListingForm({ listing, currentUserId }: EditListingFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser, subscriptionStatus } = useAuth(); 
  const { refreshListings } = useListingsData();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);

  const [isAiLoading, startAiTransition] = useTransition();

  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestionOutput | null>(null);
  const [titleSuggestion, setTitleSuggestion] = useState<SuggestListingTitleOutput | null>(null);
  const [descriptionSuggestion, setDescriptionSuggestion] = useState<GenerateListingDescriptionOutput | null>(null);

  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocationVerified, setIsLocationVerified] = useState(false);
  const geocodingApi = useMapsLibrary('geocoding');
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);

  const form = useForm<EditListingFormData>({
    resolver: zodResolver(editListingFormSchema),
    defaultValues: {
      ...listing,
      downPayment: listing.downPayment ?? undefined,
      minLeaseDurationMonths: listing.minLeaseDurationMonths ?? null,
      images: listing.images || [],
    },
  });

  const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors, isDirty } } = form;
  
  useEffect(() => {
    if (geocodingApi && !geocoder) {
      setGeocoder(new geocodingApi.Geocoder());
    }
  }, [geocodingApi, geocoder]);


  useEffect(() => {
    form.reset({
      ...listing,
      downPayment: listing.downPayment ?? undefined,
      minLeaseDurationMonths: listing.minLeaseDurationMonths ?? null,
      images: listing.images || [],
    });
    setImagePreviews((listing.images || []).map(url => ({ url, isLoading: false })));
    if (listing.lat && listing.lng) {
      setIsLocationVerified(true);
    }
  }, [listing, form.reset]);


  const watchedTitle = watch('title');
  const watchedDescription = watch('description');
  const watchedLocation = watch('location');
  const watchedSizeSqft = watch('sizeSqft');
  const watchedPrice = watch('price');
  const watchedAmenities = watch('amenities');
  const watchedPricingModel = watch('pricingModel');
  const watchedLeaseTerm = watch('leaseTerm');

  const isPremiumUser = subscriptionStatus === 'premium';
  const isMockModeNoUser = firebaseInitializationError !== null && !currentUser?.appProfile;
  const imageUploadLimit = isPremiumUser ? MAX_IMAGES : MAX_IMAGES_FREE;


  const handleSuggestPrice = async () => {
    setPriceSuggestion(null);
    const input: PriceSuggestionInput = { location: watchedLocation, sizeSqft: Number(watchedSizeSqft), amenities: watchedAmenities?.join(', ') || 'none' };
    if (!input.location || !input.sizeSqft || input.sizeSqft <= 0) {
        toast({ title: "Input Error", description: "Valid location and size needed for price suggestion.", variant: "destructive" }); return;
    }
    startAiTransition(async () => {
      const result = await getSuggestedPriceAction(input);
      if (result.data) { 
        setPriceSuggestion(result.data); 
        toast({ title: "Price Suggestion!", description: `Suggested: $${result.data.suggestedPrice.toFixed(0)}/month.` }); 
      } else { toast({ title: "Suggestion Error", description: result.error, variant: "destructive" }); }
    });
  };

  const handleSuggestTitle = async () => {
    if (!isPremiumUser) {
      toast({ title: "Premium Feature", description: "AI Title Assistant is a premium feature. Upgrade to unlock.", action: <ToastAction altText="Upgrade" onClick={() => router.push('/pricing')}>Upgrade</ToastAction> });
      return;
    }
    setTitleSuggestion(null);
    const input: SuggestListingTitleInput = { location: watchedLocation, sizeSqft: Number(watchedSizeSqft) || undefined, keywords: watchedAmenities?.slice(0,3).join(', ') || 'land for rent', existingDescription: watchedDescription.substring(0,200) };
    if (!input.location || !input.keywords) {
        toast({ title: "Input Error", description: "Location and keywords needed for title suggestion.", variant: "destructive" }); return;
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

    if (imagePreviews.length + files.length > imageUploadLimit) {
      setImageUploadError(`Cannot exceed ${imageUploadLimit} images.`);
      return;
    }

    const tempPreviews: ImagePreview[] = files.map(file => ({
      url: URL.createObjectURL(file),
      isLoading: true,
      file: file
    }));
    setImagePreviews(prev => [...prev, ...tempPreviews]);

    // Dynamically import heic2any
    const heic2any = (await import('heic2any')).default;

    for (const preview of tempPreviews) {
      let fileToUpload: File | Blob = preview.file!;
      let fileName = (preview.file as File).name;

      if (fileToUpload.type === 'image/heic' || fileName.toLowerCase().endsWith('.heic')) {
        try {
          toast({ title: "Converting Image", description: `Converting ${fileName} to a web-friendly format...`, duration: 3000 });
          const convertedBlob = await heic2any({ blob: fileToUpload, toType: 'image/jpeg', quality: 0.9 }) as Blob;
          fileToUpload = convertedBlob;
          fileName = fileName.replace(/\.[^/.]+$/, ".jpeg");
        } catch (e) {
          console.error("HEIC Conversion failed: ", e);
          toast({ title: "Conversion Failed", description: `Could not convert ${fileName}. Please try a different image format.`, variant: "destructive" });
          setImagePreviews(prev => prev.filter(p => p.url !== preview.url));
          URL.revokeObjectURL(preview.url);
          continue;
        }
      }

      try {
        const downloadURL = await uploadListingImage(fileToUpload as File, currentUser.uid);
        setImagePreviews(prev => prev.map(p => p.url === preview.url ? { ...p, url: downloadURL, isLoading: false, file: undefined } : p));
        URL.revokeObjectURL(preview.url);
        const currentImages = getValues('images');
        setValue('images', [...currentImages, downloadURL], { shouldDirty: true, shouldValidate: true });
      } catch (error) {
        console.error("Upload failed for a file:", error);
        setImagePreviews(prev => prev.filter(p => p.url !== preview.url));
        URL.revokeObjectURL(preview.url);
        toast({ title: "Upload Failed", description: `Could not upload ${fileName}.`, variant: "destructive" });
      }
    }
  };
  
  const handleRemoveImage = (indexToRemove: number) => {
    const newImagePreviews = imagePreviews.filter((_, i) => i !== indexToRemove);
    setImagePreviews(newImagePreviews);
    setValue('images', newImagePreviews.filter(p => !p.isLoading).map(p => p.url), { shouldDirty: true, shouldValidate: true });
  };
  
  const handleGeocode = async () => {
    if (!geocoder) {
      toast({ title: 'Geocoding service not ready.', variant: 'destructive' });
      return;
    }
    const location = getValues('location');
    if (!location) {
      toast({ title: 'Location Needed', description: 'Please enter a location to verify.', variant: 'destructive'});
      return;
    }
    setIsGeocoding(true);
    setIsLocationVerified(false);
    
    geocoder.geocode({ address: location }, (results, status) => {
      setIsGeocoding(false);
      if (status === 'OK' && results && results[0]) {
        const { lat, lng } = results[0].geometry.location;
        setValue('lat', lat(), { shouldDirty: true });
        setValue('lng', lng(), { shouldDirty: true });
        setIsLocationVerified(true);
        toast({ title: 'Location Verified!', description: `Coordinates set for ${results[0].formatted_address}` });
      } else {
        toast({ title: 'Geocoding Failed', description: `Could not find coordinates for "${location}". Please try a more specific address.`, variant: 'destructive' });
      }
    });
  };


  const onSubmit = async (data: EditListingFormData) => {
    if (!currentUser?.uid || currentUser.uid !== listing.landownerId) {
      setSubmissionError("You are not authorized to edit this listing.");
      return;
    }
    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionSuccess(false);

    try {
        const finalImageUrls = imagePreviews.filter(p => !p.isLoading).map(p => p.url);
        if(finalImageUrls.length === 0){
            throw new Error("Please upload at least one image.");
        }

        const updateData: Partial<Listing> = {
            ...data,
            images: finalImageUrls,
            downPayment: data.downPayment || undefined,
            minLeaseDurationMonths: (data.leaseTerm !== 'flexible' && data.minLeaseDurationMonths && Number.isInteger(data.minLeaseDurationMonths) && data.minLeaseDurationMonths > 0) ? data.minLeaseDurationMonths : undefined,
        };

        const listingDocRef = doc(db, "listings", listing.id);
        await updateDoc(listingDocRef, updateData);
        
        toast({ title: "Success!", description: `Listing "${data.title}" updated successfully!` });
        refreshListings();
        setSubmissionSuccess(true);
        router.push(`/my-listings`);

    } catch(error: any) {
        console.error("Error updating listing:", error);
        setSubmissionError(error.message || "An unknown error occurred.");
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const priceLabel = watchedPricingModel === 'nightly' ? "Price per Night ($)" : watchedPricingModel === 'monthly' ? "Price per Month ($)" : "Est. Monthly Payment ($) for LTO";

  return (
    <Card className="w-full max-w-2xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Edit Listing: <span className="text-primary">{listing.title}</span></CardTitle>
        <CardDescription>Update details for your land listing.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="title">Listing Title</Label>
            <div className="flex items-center gap-2">
              <Input id="title" {...register('title')} className="flex-grow" />
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleSuggestTitle}
                      disabled={isAiLoading || !watchedLocation || isMockModeNoUser}
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
                <Textarea id="description" {...register('description')} rows={5} className="flex-grow"/>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleSuggestDescription}
                        disabled={isAiLoading || !watchedTitle || !watchedLocation || !watchedSizeSqft || !watchedPrice || isMockModeNoUser}
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
          
           <div>
              <Label htmlFor="location">Location (City, State, or Full Address)</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-grow">
                    <Input id="location" {...register('location', { onChange: () => setIsLocationVerified(false) })} />
                    {isLocationVerified && <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500"/>}
                </div>
                <Button type="button" onClick={handleGeocode} disabled={!geocoder || isGeocoding}>
                    {isGeocoding ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <MapPin className="mr-2 h-4 w-4"/>}
                    Verify
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Verify location to ensure it shows up correctly on the map.</p>
              {errors.location && <p className="text-sm text-destructive mt-1">{errors.location.message}</p>}
            </div>

            <div><Label htmlFor="sizeSqft">Size (sq ft)</Label><Input id="sizeSqft" type="number" {...register('sizeSqft')} />{errors.sizeSqft && <p className="text-sm text-destructive mt-1">{errors.sizeSqft.message}</p>}</div>

          <div>
            <Label>Images ({imagePreviews.length} / {imageUploadLimit})</Label>
            <div className="mt-2">
              <label htmlFor="image-upload" className={cn("flex flex-col justify-center items-center p-6 border-2 border-dashed rounded-md cursor-pointer hover:border-primary", imageUploadError && "border-destructive")}>
                <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> or drag & drop</span>
                <p className="text-xs text-muted-foreground">PNG, JPG, HEIC up to {MAX_FILE_SIZE_MB}MB</p>
                <Input id="image-upload" type="file" multiple accept="image/*,.heic" className="sr-only" onChange={handleFileChange} disabled={imagePreviews.length >= imageUploadLimit || isMockModeNoUser} />
              </label>
            </div>
            {imageUploadError && <p className="text-sm text-destructive mt-1">{imageUploadError}</p>}
            {imagePreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {imagePreviews.map((preview, index) => (
                  <div key={preview.url || index} className="relative aspect-square group">
                    <Image src={preview.url} alt={`Preview ${index + 1}`} fill className="object-cover rounded-md" sizes="100px"/>
                     {preview.isLoading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                    )}
                    {!preview.isLoading && (
                        <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 z-10" onClick={() => handleRemoveImage(index)}><Trash2 className="h-3 w-3" /></Button>
                    )}
                  </div>
                ))}
                {imagePreviews.length < imageUploadLimit && <label htmlFor="image-upload" className="aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer hover:border-primary text-muted-foreground hover:text-primary"><FileImage className="h-8 w-8"/><span className="text-xs mt-1">Add more</span></label>}
              </div>
            )}
            {errors.images && <p className="text-sm text-destructive mt-1">{errors.images.message}</p>}
          </div>
          
          <div>
            <Label className="mb-2 block">Pricing Model</Label>
            <Controller name="pricingModel" control={control} render={({ field }) => (
                <RadioGroup onValueChange={(value) => { field.onChange(value); if (value !== 'lease-to-own') { setValue('leaseToOwnDetails', '', {shouldDirty: isDirty}); setValue('downPayment', undefined, {shouldDirty: isDirty}); } }} value={field.value} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 border rounded-md">
                    {(['nightly', 'monthly', 'lease-to-own'] as PricingModel[]).map(model => (
                         <Label key={model} htmlFor={`pricing-${model}-edit`} className={cn("flex items-center space-x-2 p-2 rounded-md border cursor-pointer hover:bg-accent/10", field.value === model && "bg-accent/20 border-accent ring-1 ring-accent")}><RadioGroupItem value={model} id={`pricing-${model}-edit`} /><span>{model.replace('-', ' ')}</span></Label>))}
                </RadioGroup>)} />
            {errors.pricingModel && <p className="text-sm text-destructive mt-1">{errors.pricingModel.message}</p>}
          </div>
          
          {watchedPricingModel === 'lease-to-own' && (
            <div className="space-y-6">
                <div>
                    <Label htmlFor="leaseToOwnDetails">Lease-to-Own Details</Label>
                    <Textarea id="leaseToOwnDetails" {...register('leaseToOwnDetails')} rows={3} placeholder="Describe key terms, e.g., term length, purchase price, etc." />
                    {errors.leaseToOwnDetails && <p className="text-sm text-destructive mt-1">{errors.leaseToOwnDetails.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="downPayment">Down Payment ($)</Label>
                    <Input id="downPayment" type="number" {...register('downPayment')} placeholder="e.g., 5000" />
                    {errors.downPayment && <p className="text-sm text-destructive mt-1">{errors.downPayment.message}</p>}
                </div>
            </div>
          )}

          <div>
            <Label htmlFor="price">{priceLabel}</Label>
            <div className="flex items-center gap-2">
              <Input id="price" type="number" {...register('price')} className="flex-grow" />
              {watchedPricingModel !== 'lease-to-own' && <Button type="button" variant="outline" size="icon" onClick={handleSuggestPrice} disabled={isAiLoading || !watchedLocation || !watchedSizeSqft || (watchedSizeSqft != null && watchedSizeSqft <= 0) || isMockModeNoUser} title="Suggest Price"><Sparkles className="h-4 w-4 text-accent" /></Button>}
            </div>
            {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
            {priceSuggestion && watchedPricingModel !== 'lease-to-own' && <Alert className="mt-2"><Info className="h-4 w-4" /><AlertTitle>AI Suggested: ${priceSuggestion.suggestedPrice.toFixed(0)}/month</AlertTitle><AlertDescription><p className="text-xs">{priceSuggestion.reasoning}</p><Button type="button" size="sm" variant="link" className="p-0 h-auto text-xs" onClick={() => setValue('price', parseFloat(priceSuggestion.suggestedPrice.toFixed(0)), {shouldDirty: true})}>Use</Button></AlertDescription></Alert>}
          </div>

          <div><Label className="flex items-center mb-2"><CalendarClock className="h-4 w-4 mr-2 text-primary" /> Lease Term Options</Label><Controller name="leaseTerm" control={control} render={({ field }) => (
                <RadioGroup onValueChange={(value) => { field.onChange(value); if (value === 'flexible') setValue('minLeaseDurationMonths', null, {shouldDirty: isDirty}); }} value={field.value || 'flexible'} className="space-y-1 p-2 border rounded-md">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="short-term" id="term-short-edit" /><Label htmlFor="term-short-edit" className="font-normal">Short Term (&lt; 6 mo)</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="long-term" id="term-long-edit" /><Label htmlFor="term-long-edit" className="font-normal">Long Term (6+ mo)</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="flexible" id="term-flexible-edit" /><Label htmlFor="term-flexible-edit" className="font-normal">Flexible</Label></div>
                </RadioGroup>)} />{errors.leaseTerm && <p className="text-sm text-destructive mt-1">{errors.leaseTerm.message}</p>}
          </div>

          {watchedLeaseTerm && watchedLeaseTerm !== 'flexible' && (
            <div><Label htmlFor="minLeaseDurationMonths">Min. Lease (Months)</Label><Input id="minLeaseDurationMonths" type="number" {...register('minLeaseDurationMonths')} />{errors.minLeaseDurationMonths && <p className="text-sm text-destructive mt-1">{errors.minLeaseDurationMonths.message}</p>}</div>
          )}
          
          <div><Label>Amenities</Label><Controller name="amenities" control={control} render={({ field }) => (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2 p-4 border rounded-md">
                  {amenitiesList.map(amenity => (<div key={amenity.id} className="flex items-center space-x-2">
                      <Checkbox id={`amenity-${amenity.id}-edit`} checked={field.value?.includes(amenity.id)} onCheckedChange={checked => field.onChange(checked ? [...(field.value || []), amenity.id] : (field.value || []).filter(v => v !== amenity.id))} /><Label htmlFor={`amenity-${amenity.id}-edit`} className="font-normal">{amenity.label}</Label></div>))}
                </div>)} />{errors.amenities && <p className="text-sm text-destructive mt-1">{errors.amenities[0]?.message}</p>}
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <Controller name="isAvailable" control={control} render={({ field }) => (
                <Switch 
                    id="isAvailable-edit" 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                    aria-label="Listing Availability"
                />
            )} />
            <Label htmlFor="isAvailable-edit" className="cursor-pointer">Make this listing available for booking</Label>
            {errors.isAvailable && <p className="text-sm text-destructive mt-1">{errors.isAvailable.message}</p>}
          </div>

        </CardContent>
        <CardFooter className="flex justify-between items-center gap-2">
          <Button variant="outline" type="button" asChild><Link href={`/my-listings`}><ArrowLeft className="mr-2 h-4 w-4"/> Back to My Listings</Link></Button>
          <Button type="submit" disabled={isSubmitting || !isDirty || isMockModeNoUser}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Update Listing</Button>
        </CardFooter>
      </form>
      {submissionSuccess && <div className="p-4 mt-4"><Alert variant="default" className="border-green-500 bg-green-50"><CheckCircle className="h-4 w-4 text-green-600" /><AlertTitle className="text-green-700">Listing Updated!</AlertTitle><AlertDescription className="text-green-600">Your changes have been saved.<Button asChild variant="link" className="ml-2 p-0 h-auto text-green-700"><Link href={`/listings/${listing.id}`}>View Listing</Link></Button></AlertDescription></Alert></div>}
      {submissionError && <div className="p-4 mt-4"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Update Failed</AlertTitle><AlertDescription>{submissionError}</AlertDescription></Alert></div>}
    </Card>
  );
}
