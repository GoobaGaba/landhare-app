
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Info, Loader2, CheckCircle, AlertCircle, CalendarClock, UserCircle, Percent, UploadCloud, Trash2, FileImage, Lightbulb, FileText, Crown, MapPin, Droplets, UtilityPole, SquareDashedBottom, Dog, Wifi, Waves, Flame, Edit } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from '@/contexts/auth-context';
import { useListingsData } from '@/hooks/use-listings-data'; 
import { uploadListingImage } from '@/lib/storage';
import { addListing } from '@/lib/mock-data';

import { getSuggestedPriceAction, getSuggestedTitleAction, getGeneratedDescriptionAction } from '@/lib/actions/ai-actions';
import type { Listing, PriceSuggestionInput, PriceSuggestionOutput, LeaseTerm, SuggestListingTitleInput, SuggestListingTitleOutput, PricingModel, GenerateListingDescriptionInput, GenerateListingDescriptionOutput } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FREE_TIER_LISTING_LIMIT } from '@/lib/mock-data'; 
import { firebaseInitializationError } from '@/lib/firebase';

const amenitiesList = [
  { id: 'water hookup', label: 'Water Hookup', icon: Droplets },
  { id: 'power access', label: 'Power Access', icon: UtilityPole },
  { id: 'septic system', label: 'Septic System', icon: Trash2 },
  { id: 'road access', label: 'Road Access', icon: MapPin },
  { id: 'fenced', label: 'Fenced', icon: SquareDashedBottom },
  { id: 'pet friendly', label: 'Pet Friendly', icon: Dog },
  { id: 'wifi available', label: 'Wi-Fi Available', icon: Wifi },
  { id: 'lake access', label: 'Lake Access', icon: Waves },
  { id: 'fire pit', label: 'Fire Pit', icon: Flame },
];

const MAX_IMAGES = 10;
const MAX_IMAGES_STANDARD = 5;
const MAX_FILE_SIZE_MB = 5;

const listingFormSchema = z.object({
  title: z.string({ required_error: "Title is required." }).min(3, { message: "Title must be at least 3 characters." }),
  description: z.string({ required_error: "Description is required." }).min(10, { message: "Description must be at least 10 characters." }),
  location: z.string({ required_error: "Location is required." }).min(3, { message: "Location is required." }),
  lat: z.number().optional(),
  lng: z.number().optional(),
  sizeSqft: z.coerce.number({ required_error: "Size is required.", invalid_type_error: "Size must be a number." }).positive({ message: "Size must be a positive number." }).min(1, "Size must be a positive number."),
  price: z.coerce.number({ required_error: "Price is required.", invalid_type_error: "Price must be a number." }).positive({ message: "Price must be a positive number." }).min(1, "Price must be a positive number."),
  pricingModel: z.enum(['nightly', 'monthly', 'lease-to-own'], { required_error: "Please select a pricing model."}),
  leaseToOwnDetails: z.string().optional(),
  downPayment: z.coerce.number().positive("Down payment must be a positive number.").optional(),
  amenities: z.array(z.string()).optional().default([]),
  images: z.array(z.string().url("Each image must be a valid URL.")).optional().default([]),
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
type ImagePreview = { url: string; isLoading: boolean; file?: File | Blob };

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
  
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocationVerified, setIsLocationVerified] = useState(false);
  const geocodingApi = useMapsLibrary('geocoding');
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);


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
  
  useEffect(() => {
    if (geocodingApi && !geocoder) {
      setGeocoder(new geocodingApi.Geocoder());
    }
  }, [geocodingApi, geocoder]);


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
  const imageUploadLimit = isPremiumUser ? MAX_IMAGES : MAX_IMAGES_STANDARD;
  const isMockModeNoUser = firebaseInitializationError !== null && !currentUser?.appProfile;
  const isUploadingImages = imagePreviews.some(p => p.isLoading);

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
    let processedFiles: (File | Blob)[] = [];

    // --- Validation Step ---
    if (imagePreviews.length + files.length > imageUploadLimit) {
      setImageUploadError(`Cannot exceed ${imageUploadLimit} images.`);
      return;
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setImageUploadError(`File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`);
        toast({ title: "File Too Large", description: `"${file.name}" is too large. Please upload files smaller than ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
        continue; // Skip this file
      }
      processedFiles.push(file);
    }
    
    if (processedFiles.length === 0) return;

    const tempPreviews: ImagePreview[] = processedFiles.map(file => ({
      url: URL.createObjectURL(file),
      isLoading: true,
      file: file
    }));
    setImagePreviews(prev => [...prev, ...tempPreviews]);

    // --- Conversion and Upload Step ---
    const heic2any = (await import('heic2any')).default;

    for (const preview of tempPreviews) {
      let fileToUpload: File | Blob = preview.file!;
      let fileName = (preview.file as File).name;

      // Convert HEIC/HEIF files
      if (fileToUpload.type === 'image/heic' || fileToUpload.type === 'image/heif' || fileName?.toLowerCase().endsWith('.heic') || fileName?.toLowerCase().endsWith('.heif')) {
        try {
          toast({ title: "Converting Image", description: `Converting ${fileName} to a web-friendly format...`, duration: 3000 });
          const convertedBlob = await heic2any({ blob: fileToUpload, toType: 'image/jpeg', quality: 0.9 }) as Blob;
          const newFileName = (fileName || 'image.heic').replace(/\.[^/.]+$/, ".jpeg");
          fileToUpload = new File([convertedBlob], newFileName, { type: 'image/jpeg' });
          fileName = newFileName;
        } catch (e) {
          console.error("HEIC Conversion failed: ", e);
          toast({ title: "Conversion Failed", description: `Could not convert ${fileName}. Please try a different image format.`, variant: "destructive" });
          setImagePreviews(prev => prev.filter(p => p.url !== preview.url));
          URL.revokeObjectURL(preview.url);
          continue;
        }
      }

      // Upload the processed file
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

  const onSubmit = async (data: ListingFormData) => {
    if (!isLocationVerified) {
        toast({
            title: "Location Not Verified",
            description: "Please click the 'Verify' button next to the location to confirm its position on the map before creating the listing.",
            variant: "destructive",
            duration: 7000,
        });
        return; // Block submission
    }

    if (authLoading || !currentUser?.uid) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" }); return;
    }
    if (atListingLimit) {
      toast({ title: "Listing Limit Reached", description: `Standard accounts can only create ${FREE_TIER_LISTING_LIMIT} listing. Please upgrade to Premium.`, variant: "destructive", action: <ToastAction altText="Upgrade" onClick={() => router.push('/pricing')}>Upgrade</ToastAction> });
      return;
    }
    
    setIsSubmitting(true); setSubmissionError(null); setSubmissionSuccess(null); setFormSubmittedSuccessfully(false);
    try {
      let finalImageUrls = imagePreviews.filter(p => !p.isLoading).map(p => p.url);
      if(finalImageUrls.length === 0){
        finalImageUrls = [`https://placehold.co/800x600.png?text=${encodeURIComponent(data.title)}`];
      }
      
      let leaseTerm = data.leaseTerm;
      if (data.pricingModel === 'nightly') leaseTerm = 'short-term';
      if (data.pricingModel === 'lease-to-own') leaseTerm = 'flexible';

      const newListingPayload: Omit<Listing, 'id'> = {
        ...data,
        images: finalImageUrls,
        landownerId: currentUser.uid,
        isAvailable: true,
        rating: undefined,
        numberOfRatings: 0,
        isBoosted: subscriptionStatus === 'premium',
        createdAt: new Date(),
        leaseTerm: leaseTerm,
      };
      
      // Critical: Remove undefined keys before sending to Firestore
      Object.keys(newListingPayload).forEach(key => {
        if (newListingPayload[key as keyof typeof newListingPayload] === undefined) {
          delete newListingPayload[key as keyof typeof newListingPayload];
        }
      });
      
      const newListing = await addListing(newListingPayload);
      
      setSubmissionSuccess({ message: `Listing "${data.title}" created successfully!`, listingId: newListing.id });
      toast({ title: "Success!", description: `Listing "${data.title}" created!`, action: <ToastAction altText="View Listing" onClick={() => router.push(`/listings/${newListing.id}`)}>View</ToastAction> });
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
      // Sanitize the error message to be more user-friendly
      if (errorMessage.includes("Unsupported field value: undefined")) {
          errorMessage = "An internal error occurred while preparing data. Please ensure all fields are filled correctly and try again.";
      }
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
  const minStayLabel = watchedPricingModel === 'nightly' ? "Minimum Stay (Nights)" : "Minimum Lease (Months)";
  const isActualSubmitButtonDisabled = isSubmitting || authLoading || !currentUser?.uid || atListingLimit || isMockModeNoUser || isUploadingImages;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader><CardTitle>Create New Land Listing</CardTitle><CardDescription>Fill details to list your land on LandHare.</CardDescription></CardHeader>
      {atListingLimit && (
        <Alert variant="destructive" className="mx-6 mb-0">
            <Crown className="h-4 w-4 text-premium" />
            <AlertTitle>Listing Limit Reached</AlertTitle>
            <AlertDescription>
              Standard accounts can create {FREE_TIER_LISTING_LIMIT} listing. <Button variant="link" asChild className="p-0 h-auto text-premium hover:text-premium/80"><Link href="/pricing">Upgrade to Premium</Link></Button> for unlimited listings.
            </AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6 pt-6">
          <div>
            <Label htmlFor="title">Listing Title</Label>
            <div className="flex items-center gap-2">
              <Input id="title" {...register('title')} aria-invalid={errors.title ? "true" : "false"} className="flex-grow" />
               <div className="relative">
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleSuggestTitle}
                          disabled={isAiLoading || !watchedLocation || isMockModeNoUser || !isPremiumUser}
                        >
                          {isAiLoading && titleSuggestion === null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4 text-yellow-500" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>{isPremiumUser ? "Suggest Title with AI" : "AI Title Assistant (Premium Feature)"}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {!isPremiumUser && <Crown className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-premium fill-premium pointer-events-none" />}
              </div>
            </div>
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
            {titleSuggestion && <Alert className="mt-2"><Info className="h-4 w-4" /><AlertTitle>Suggested: "{titleSuggestion.suggestedTitle}"</AlertTitle><AlertDescription><p className="text-xs">{titleSuggestion.reasoning}</p><Button type="button" size="sm" variant="link" className="p-0 h-auto text-xs" onClick={() => setValue('title', titleSuggestion.suggestedTitle, {shouldDirty: true})}>Use</Button></AlertDescription></Alert>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
             <div className="flex items-start gap-2">
                <Textarea id="description" {...register('description')} rows={5} aria-invalid={errors.description ? "true" : "false"} className="flex-grow"/>
                <div className="relative">
                    <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleSuggestDescription}
                            disabled={isAiLoading || !watchedTitle || !watchedLocation || !watchedSizeSqft || !watchedPrice || isMockModeNoUser || !isPremiumUser}
                            >
                            {isAiLoading && descriptionSuggestion === null ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-premium" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>{isPremiumUser ? "Generate Description with AI" : "AI Description Generator (Premium Feature)"}</p></TooltipContent>
                    </Tooltip>
                    </TooltipProvider>
                    {!isPremiumUser && <Crown className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-premium fill-premium pointer-events-none" />}
                </div>
            </div>
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
            {descriptionSuggestion && <Alert className="mt-2"><Info className="h-4 w-4" /><AlertTitle>Suggested Description:</AlertTitle><AlertDescription><p className="text-xs whitespace-pre-line">{descriptionSuggestion.suggestedDescription}</p><Button type="button" size="sm" variant="link" className="p-0 h-auto text-xs" onClick={() => setValue('description', descriptionSuggestion.suggestedDescription, {shouldDirty: true})}>Use</Button></AlertDescription></Alert>}
          </div>
          
          <div>
              <Label htmlFor="location">Location (City, State, or Full Address)</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-grow">
                    <Input id="location" {...register('location', { onChange: () => setIsLocationVerified(false) })} aria-invalid={errors.location ? "true" : "false"} disabled={isLocationVerified} />
                    {isLocationVerified && <Button variant="ghost" size="icon" onClick={() => setIsLocationVerified(false)} className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"><Edit className="h-4 w-4 text-muted-foreground"/></Button>}
                </div>
                <Button type="button" onClick={handleGeocode} disabled={!geocoder || isGeocoding || isLocationVerified}>
                    {isGeocoding ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <MapPin className="mr-2 h-4 w-4"/>}
                    {isLocationVerified ? "Verified" : "Verify"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">You must verify your location to ensure it appears on the map correctly.</p>
              {errors.location && <p className="text-sm text-destructive mt-1">{errors.location.message}</p>}
            </div>

            <div><Label htmlFor="sizeSqft">Size (Square Feet)</Label><Input id="sizeSqft" type="number" min="1" {...register('sizeSqft')} aria-invalid={errors.sizeSqft ? "true" : "false"} />{errors.sizeSqft && <p className="text-sm text-destructive mt-1">{errors.sizeSqft.message}</p>}</div>

          <div>
            <Label>Images (up to {imageUploadLimit})</Label>
            <div className="mt-2">
              <label htmlFor="image-upload" className={cn("flex flex-col justify-center items-center p-6 border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors", imageUploadError ? "border-destructive" : "border-border")}>
                <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</span>
                <p className="text-xs text-muted-foreground">PNG, JPG, HEIC up to {MAX_FILE_SIZE_MB}MB each</p>
                <Input id="image-upload" type="file" multiple accept="image/*,.heic,.heif" className="sr-only" onChange={handleFileChange} disabled={imagePreviews.length >= imageUploadLimit || isMockModeNoUser} />
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
                {imagePreviews.length < imageUploadLimit && (<label htmlFor="image-upload" className="aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer hover:border-primary text-muted-foreground hover:text-primary transition-colors"><FileImage className="h-8 w-8"/><span className="text-xs mt-1">Add more</span></label>)}
            </div>
            {errors.images && <p className="text-sm text-destructive mt-1">{errors.images[0]?.message}</p>}
          </div>

          <div>
            <Label className="mb-2 block">Pricing Model</Label>
            <Controller name="pricingModel" control={control} render={({ field }) => (<RadioGroup onValueChange={(value) => { field.onChange(value); if(value !== 'lease-to-own') setValue('leaseToOwnDetails', '', {shouldDirty: true }); if(value !== 'lease-to-own') setValue('downPayment', undefined, {shouldDirty: true }); }} value={field.value} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 border rounded-md">
                    {(['nightly', 'monthly', 'lease-to-own'] as PricingModel[]).map(model => (<Label key={model} htmlFor={`pricing-${model}`} className={cn("flex items-center space-x-2 p-2 rounded-md border cursor-pointer hover:bg-accent/10 transition-colors", field.value === model && "bg-accent/20 border-accent ring-1 ring-accent")}><RadioGroupItem value={model} id={`pricing-${model}`} /><span className="capitalize">{model.replace('-', ' ')}</span></Label>))}
                </RadioGroup>)} />
            {errors.pricingModel && <p className="text-sm text-destructive mt-1">{errors.pricingModel.message}</p>}
          </div>
          
          {watchedPricingModel === 'lease-to-own' && (
            <div className="space-y-6">
                <div>
                    <Label htmlFor="leaseToOwnDetails">Lease-to-Own Details</Label>
                    <Textarea id="leaseToOwnDetails" {...register('leaseToOwnDetails')} rows={3} placeholder="Describe key terms, e.g., term length, purchase price, etc." aria-invalid={errors.leaseToOwnDetails ? "true" : "false"} />
                    {errors.leaseToOwnDetails && <p className="text-sm text-destructive mt-1">{errors.leaseToOwnDetails.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="downPayment">Down Payment ($)</Label>
                    <Input id="downPayment" type="number" min="0" {...register('downPayment')} placeholder="e.g., 5000" />
                    {errors.downPayment && <p className="text-sm text-destructive mt-1">{errors.downPayment.message}</p>}
                </div>
            </div>
          )}

          <div>
            <Label htmlFor="price">{priceLabel}</Label>
            <div className="flex items-center gap-2">
              <Input id="price" type="number" min="1" {...register('price')} aria-invalid={errors.price ? "true" : "false"} className="flex-grow" />
              {watchedPricingModel !== 'lease-to-own' && (<Button type="button" variant="outline" size="icon" onClick={handleSuggestPrice} disabled={isAiLoading || !watchedLocation || !watchedSizeSqft || (watchedSizeSqft != null && watchedSizeSqft <= 0) || isMockModeNoUser} title="Suggest Price with AI (for monthly rates)"><Sparkles className="h-4 w-4 text-accent" /></Button>)}
            </div>
            {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
            {priceSuggestion && watchedPricingModel !== 'lease-to-own' && <Alert className="mt-2"><Info className="h-4 w-4" /><AlertTitle>AI Suggested: ${priceSuggestion.suggestedPrice.toFixed(0)}/month</AlertTitle><AlertDescription><p className="text-xs">{priceSuggestion.reasoning}</p><Button type="button" size="sm" variant="link" className="p-0 h-auto text-xs" onClick={() => setValue('price', parseFloat(priceSuggestion.suggestedPrice.toFixed(0)), {shouldDirty: true})}>Use</Button></AlertDescription></Alert>}
          </div>
          
          {watchedPricingModel !== 'nightly' && watchedPricingModel !== 'lease-to-own' && (
            <div>
              <Label className="flex items-center mb-2"><CalendarClock className="h-4 w-4 mr-2 text-primary" /> Duration options (LTO included)</Label>
              <Controller name="leaseTerm" control={control} render={({ field }) => (<RadioGroup onValueChange={(value) => { field.onChange(value); if (value === 'flexible') setValue('minLeaseDurationMonths', null, {shouldDirty: true}); }} value={field.value || 'flexible'} className="space-y-1 p-2 border rounded-md">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="short-term" id="term-short" /><Label htmlFor="term-short" className="font-normal">Short Term (&lt;30 days)</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="long-term" id="term-long" /><Label htmlFor="term-long" className="font-normal">Long Term (1+ month)</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="flexible" id="term-flexible" /><Label htmlFor="term-flexible" className="font-normal">Flexible (+Pathway to LTO)</Label></div>
                  </RadioGroup>)} />
              {errors.leaseTerm && <p className="text-sm text-destructive mt-1">{errors.leaseTerm.message}</p>}
            </div>
          )}

          {watchedPricingModel !== 'lease-to-own' && watchedLeaseTerm !== 'flexible' && (
              <div>
                  <Label htmlFor="minLeaseDurationMonths">{minStayLabel}</Label>
                  <Input id="minLeaseDurationMonths" type="number" min="1" placeholder={watchedPricingModel === 'nightly' ? "e.g., 2" : "e.g., 1, 6, 12"} {...register('minLeaseDurationMonths')} aria-invalid={errors.minLeaseDurationMonths ? "true" : "false"} />
                  {errors.minLeaseDurationMonths && <p className="text-sm text-destructive mt-1">{errors.minLeaseDurationMonths.message}</p>}
              </div>
          )}
          
           <div><Label>Amenities</Label><Controller name="amenities" control={control} render={({ field }) => (<div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2 p-4 border rounded-md">
                  {amenitiesList.map(amenity => (<div key={amenity.id} className="flex items-center space-x-2">
                      <Checkbox id={`amenity-${amenity.id}`} checked={field.value?.includes(amenity.id)} onCheckedChange={checked => field.onChange(checked ? [...(field.value || []), amenity.id] : (field.value || []).filter(v => v !== amenity.id))} />
                      <Label htmlFor={`amenity-${amenity.id}`} className="font-normal flex items-center gap-2">
                        <amenity.icon className="h-4 w-4 text-muted-foreground" />
                        {amenity.label}
                      </Label>
                    </div>))}
                </div>)} />{errors.amenities && <p className="text-sm text-destructive mt-1">{errors.amenities[0]?.message}</p>}
          </div>

          <Alert variant="default" className="mt-4 bg-muted/40">
            <Percent className="h-4 w-4" />
            <AlertTitle className="text-sm font-medium">Trust and Transparency</AlertTitle>
            <AlertDescription className="text-xs">
              Always free to post a listing. Service fee only applied when a listing is booked and paid for.
              <br />
              Landowner payouts have a service fee. 
              <span className={cn(subscriptionStatus === 'premium' && 'font-bold text-premium')}> Premium: 0.49%</span> | 
              <span className={cn(subscriptionStatus === 'standard' && 'font-bold text-primary')}> Standard: 2%</span>.
              <Link href="/pricing" className="underline ml-1 hover:text-primary">Learn more</Link>
            </AlertDescription>
          </Alert>
          {!isPremiumUser && myListings.length === (FREE_TIER_LISTING_LIMIT-1) && (
             <Alert variant="default" className="border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-500/50">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold">Heads Up!</AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-300">
                   You have 1 listing slot remaining on the Standard plan.
                </AlertDescription>
            </Alert>
          )}

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
