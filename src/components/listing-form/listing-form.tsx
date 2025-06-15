
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
import { Sparkles, Info, Loader2, CheckCircle, AlertCircle, CalendarClock, UserCircle, Percent, UploadCloud, Trash2, FileImage, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from '@/contexts/auth-context';

import { getSuggestedPriceAction, getSuggestedTitleAction } from '@/lib/actions/ai-actions';
// Removed createListingAction import as we're doing client-side write
import type { ListingFormState } from '@/app/(app)/listings/new/actions'; // Keep for type if needed elsewhere, but state managed locally now
import type { Listing, PriceSuggestionInput, PriceSuggestionOutput, LeaseTerm, SuggestListingTitleInput, SuggestListingTitleOutput, PricingModel } from '@/lib/types';
import { cn } from '@/lib/utils';

import { db } from '@/lib/firebase'; // Import Firestore instance
import { collection, addDoc, Timestamp } from 'firebase/firestore'; // Import Firestore functions

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

// const initialFormState: ListingFormState = { message: '', success: false }; No longer using useActionState

export function ListingForm() {
  const { currentUser, loading: authLoading, subscriptionStatus } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false); // Local submission state
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<{ message: string, listingId?: string } | null>(null);
  
  const [isPending, startTransition] = useTransition(); // Keep for AI actions

  const [isPriceSuggestionLoading, setIsPriceSuggestionLoading] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestionOutput | null>(null);
  const [priceSuggestionError, setPriceSuggestionError] = useState<string | null>(null);

  const [isTitleSuggestionLoading, setIsTitleSuggestionLoading] = useState(false);
  const [titleSuggestion, setTitleSuggestion] = useState<SuggestListingTitleOutput | null>(null);
  const [titleSuggestionError, setTitleSuggestionError] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  
  const [currentSubscriptionOnMount, setCurrentSubscriptionOnMount] = useState<string | undefined>(undefined);
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
      minLeaseDurationMonths: undefined,
    },
  });

  const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors } } = form;

  useEffect(() => {
    if (!authLoading && currentUser?.appProfile?.subscriptionStatus) {
        setCurrentSubscriptionOnMount(currentUser.appProfile.subscriptionStatus);
    }
  }, [currentUser, authLoading]);

  const watchedTitle = watch('title');
  const watchedDescription = watch('description');
  const watchedLocation = watch('location');
  const watchedSizeSqft = watch('sizeSqft');
  const watchedAmenities = watch('amenities');
  const watchedLeaseTerm = watch('leaseTerm');
  const watchedPricingModel = watch('pricingModel');

  const handleSuggestPrice = async () => {
    setIsPriceSuggestionLoading(true);
    setPriceSuggestion(null);
    setPriceSuggestionError(null);

    const amenitiesString = watchedAmenities?.join(', ');
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
        setIsPriceSuggestionLoading(false);
        return;
    }
    startTransition(async () => {
      const result = await getSuggestedPriceAction(input);
      setIsPriceSuggestionLoading(false);
      if (result.data) {
        setPriceSuggestion(result.data);
        toast({
          title: "Price Suggestion Ready!",
          description: `Suggested price: $${result.data.suggestedPrice.toFixed(0)}/month (adapt if nightly).`,
        });
      } else if (result.error) {
        setPriceSuggestionError(result.error);
        toast({
          title: "Price Suggestion Error",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  };

  const handleSuggestTitle = async () => {
    setIsTitleSuggestionLoading(true);
    setTitleSuggestion(null);
    setTitleSuggestionError(null);

    const descriptionSnippet = watchedDescription.substring(0, 200); 
    const keywords = watchedAmenities?.slice(0,3).join(', ') + (descriptionSnippet ? `, ${descriptionSnippet.split(' ').slice(0,5).join(' ')}` : '');

    const input: SuggestListingTitleInput = {
      location: watchedLocation,
      sizeSqft: Number(watchedSizeSqft) || undefined,
      keywords: keywords || 'land for rent',
      existingDescription: descriptionSnippet,
    };

    if (!input.location || !input.keywords) {
        toast({
            title: "Input Error",
            description: "Please provide location and some keywords (from amenities/description) to get a title suggestion.",
            variant: "destructive",
        });
        setIsTitleSuggestionLoading(false);
        return;
    }
    startTransition(async () => {
      const result = await getSuggestedTitleAction(input);
      setIsTitleSuggestionLoading(false);
      if (result.data) {
        setTitleSuggestion(result.data);
        toast({
          title: "Title Suggestion Ready!",
          description: `Suggested title: "${result.data.suggestedTitle}".`,
        });
      } else if (result.error) {
        setTitleSuggestionError(result.error);
        toast({
          title: "Title Suggestion Error",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  };

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
      setValue('images', [...imagePreviews, ...previews], { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleRemoveImage = (index: number) => {
    const newSelectedFiles = selectedFiles.filter((_, i) => i !== index);
    const newImagePreviews = imagePreviews.filter((_, i) => i !== index);
    
    if (imagePreviews[index] && imagePreviews[index].startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviews[index]);
    }
    
    setSelectedFiles(newSelectedFiles);
    setImagePreviews(newImagePreviews);
    setValue('images', newImagePreviews, { shouldValidate: true, shouldDirty: true });
  };

  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, [imagePreviews]);


  const onSubmit = async (data: ListingFormData) => {
    if (authLoading || !currentUser?.uid) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a listing.",
        variant: "destructive",
      });
      return;
    }
    
    // Note: Actual image file uploads to Firebase Storage and getting their download URLs
    // would happen here in a real app before saving to Firestore.
    // For this prototype, we'll use the blob URLs or placeholders directly as if they are final URLs.
    // If imagePreviews contains actual URLs (e.g. from a previous edit), they will be used.
    // If they are blob: URLs from new uploads, they'd ideally be replaced by storage URLs.
    // For now, we'll just use what's in imagePreviews for the `images` array.
    const finalImageUrls = imagePreviews; 

    if (finalImageUrls.some(url => url.startsWith("blob:")) && selectedFiles.length > 0) {
      toast({
          title: "Image Upload Note (Prototype)",
          description: "Image previews are shown. In a full app, these would be uploaded to cloud storage, and their permanent URLs saved. Using preview URLs as placeholders for now.",
          duration: 8000,
      });
    }


    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionSuccess(null);
    setFormSubmittedSuccessfully(false);

    try {
      const newListingPayload = {
        ...data,
        landownerId: currentUser.uid,
        isAvailable: true,
        images: finalImageUrls.length > 0 ? finalImageUrls : [`https://placehold.co/800x600.png?text=${encodeURIComponent(data.title.substring(0,15))}`,"https://placehold.co/400x300.png?text=View+1", "https://placehold.co/400x300.png?text=View+2"], // Use uploaded/existing images or fallbacks
        rating: undefined,
        numberOfRatings: 0,
        isBoosted: subscriptionStatus === 'premium',
        createdAt: Timestamp.fromDate(new Date()),
        leaseToOwnDetails: data.pricingModel === 'lease-to-own' ? data.leaseToOwnDetails : '',
        minLeaseDurationMonths: (data.leaseTerm !== 'flexible' && data.minLeaseDurationMonths) ? data.minLeaseDurationMonths : undefined,
      };

      // Remove id if it accidentally got in, and ensure types match Firestore expectations
      const { id, ...payloadForFirestore } = newListingPayload as Omit<Listing, 'id'>;

      const docRef = await addDoc(collection(db, "listings"), payloadForFirestore);
      
      setSubmissionSuccess({ message: `Listing "${data.title}" created successfully!`, listingId: docRef.id });
      toast({
        title: "Success!",
        description: `Listing "${data.title}" created successfully!`,
        action: <ToastAction altText="View Listing" onClick={() => router.push(`/listings/${docRef.id}`)}>View</ToastAction>,
      });
      form.reset();
      setSelectedFiles([]);
      setImagePreviews([]);
      setPriceSuggestion(null);
      setTitleSuggestion(null);
      setFormSubmittedSuccessfully(true);

    } catch (error: any) {
      console.error("Error creating listing:", error);
      let errorMessage = "Failed to create listing. Please try again.";
      if (error.message && error.message.includes("permission-denied") || error.message.includes("PERMISSION_DENIED")) {
        errorMessage = "Permission denied. Please ensure your Firestore security rules allow writes to the 'listings' collection for authenticated users, and that the landownerId matches your UID.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      setSubmissionError(errorMessage);
      toast({
        title: "Error Creating Listing",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || (!currentUser && subscriptionStatus === 'loading') ) {
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
              You must be <Link href={`/login?redirect=${encodeURIComponent("/listings/new")}`} className="underline">logged in</Link> to create a new listing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  const priceLabel = watchedPricingModel === 'nightly' ? "Price per Night ($)"
                     : watchedPricingModel === 'monthly' ? "Price per Month ($)"
                     : "Est. Monthly Payment ($) for LTO";

  const isActualSubmitButtonDisabled = isSubmitting || authLoading || !currentUser?.uid;


  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Land Listing</CardTitle>
        <CardDescription>Fill in the details below to list your land on LandShare.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          
          <div>
            <Label htmlFor="title">Listing Title</Label>
            <div className="flex items-center gap-2">
                <Input id="title" {...register('title')} aria-invalid={errors.title ? "true" : "false"} className="flex-grow" />
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleSuggestTitle}
                    disabled={isTitleSuggestionLoading || isPending || !watchedLocation || (!watchedDescription && watchedAmenities?.length === 0)}
                    title="Suggest Title with AI"
                >
                    {isTitleSuggestionLoading || isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4 text-yellow-500" />}
                </Button>
            </div>
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
            {titleSuggestion && (
                <Alert className="mt-2">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Suggested Title: "{titleSuggestion.suggestedTitle}"</AlertTitle>
                  <AlertDescription>
                    <p className="font-medium text-xs">Reasoning:</p>
                    <p className="text-xs">{titleSuggestion.reasoning}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="link"
                      className="p-0 h-auto mt-1 text-accent text-xs"
                      onClick={() => setValue('title', titleSuggestion.suggestedTitle)}
                    >
                      Use this title
                    </Button>
                  </AlertDescription>
                </Alert>
            )}
            {titleSuggestionError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-sm">Title Suggestion Error</AlertTitle>
                  <AlertDescription className="text-xs">{titleSuggestionError}</AlertDescription>
                </Alert>
            )}
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
                  "flex flex-col justify-center items-center p-6 border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors",
                  imageUploadError ? "border-destructive" : "border-border"
                )}
              >
                <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                </span>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to {MAX_FILE_SIZE_MB}MB each</p>
                <Input id="image-upload" type="file" multiple accept="image/*" className="sr-only" onChange={handleFileChange} disabled={imagePreviews.length >= MAX_IMAGES} />
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
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sr-only">Remove image</span>
                    </Button>
                  </div>
                ))}
                {imagePreviews.length < MAX_IMAGES && (
                  <label htmlFor="image-upload" className="aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer hover:border-primary text-muted-foreground hover:text-primary transition-colors">
                    <FileImage className="h-8 w-8"/>
                    <span className="text-xs mt-1">Add more</span>
                  </label>
                )}
              </div>
            )}
             {errors.images && imagePreviews.length === 0 && <p className="text-sm text-destructive mt-1">{errors.images.message}</p>}
          </div>

          <div>
            <Label className="mb-2 block">Pricing Model</Label>
            <Controller
                name="pricingModel"
                control={control}
                render={({ field }) => (
                    <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 border rounded-md"
                    >
                        {(['nightly', 'monthly', 'lease-to-own'] as const).map(model => (
                             <Label key={model} htmlFor={`pricing-${model}`} className={cn("flex items-center space-x-2 p-2 rounded-md border cursor-pointer hover:bg-accent/10 transition-colors", field.value === model && "bg-accent/20 border-accent ring-1 ring-accent")}>
                                <RadioGroupItem value={model} id={`pricing-${model}`} />
                                <span className="capitalize">{model.replace('-', ' ')}</span>
                            </Label>
                        ))}
                    </RadioGroup>
                )}
            />
             {errors.pricingModel && <p className="text-sm text-destructive mt-1">{errors.pricingModel.message}</p>}
          </div>
          
          {watchedPricingModel === 'lease-to-own' && (
            <div>
                <Label htmlFor="leaseToOwnDetails">Lease-to-Own Details</Label>
                <Textarea id="leaseToOwnDetails" {...register('leaseToOwnDetails')} rows={3} placeholder="Describe key terms, e.g., down payment, term length, purchase price, etc." aria-invalid={errors.leaseToOwnDetails ? "true" : "false"} />
                 {errors.leaseToOwnDetails && <p className="text-sm text-destructive mt-1">{errors.leaseToOwnDetails.message}</p>}
            </div>
          )}

          <div>
            <Label htmlFor="price">{priceLabel}</Label>
            <div className="flex items-center gap-2">
                <Input id="price" type="number" {...register('price')} aria-invalid={errors.price ? "true" : "false"} className="flex-grow" />
                {watchedPricingModel !== 'lease-to-own' && (
                  <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleSuggestPrice}
                      disabled={isPriceSuggestionLoading || isPending || !watchedLocation || !watchedSizeSqft || watchedSizeSqft <= 0}
                      title="Suggest Price with AI (for monthly rates)"
                  >
                      {isPriceSuggestionLoading || isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-accent" />}
                  </Button>
                )}
            </div>
            {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
            {priceSuggestion && watchedPricingModel !== 'lease-to-own' && (
                <Alert className="mt-2">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Suggested Monthly Price: ${priceSuggestion.suggestedPrice.toFixed(0)}/month</AlertTitle>
                  <AlertDescription>
                    <p className="font-medium text-xs">Reasoning:</p>
                    <p className="text-xs">{priceSuggestion.reasoning}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="link"
                      className="p-0 h-auto mt-1 text-accent text-xs"
                      onClick={() => setValue('price', parseFloat(priceSuggestion.suggestedPrice.toFixed(0)))}
                    >
                      Use this price
                    </Button>
                     {watchedPricingModel === 'nightly' && <p className="text-xs mt-1">Adjust as needed for a nightly rate.</p>}
                  </AlertDescription>
                </Alert>
            )}
            {priceSuggestionError && watchedPricingModel !== 'lease-to-own' && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-sm">Price Suggestion Error</AlertTitle>
                  <AlertDescription className="text-xs">{priceSuggestionError}</AlertDescription>
                </Alert>
            )}
          </div>

          <div>
            <Label className="flex items-center mb-2">
                <CalendarClock className="h-4 w-4 mr-2 text-primary" /> Lease Term Options
            </Label>
            <Controller
                name="leaseTerm"
                control={control}
                render={({ field }) => (
                    <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value || 'flexible'}
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
                placeholder="e.g., 1, 6, 12"
                {...register('minLeaseDurationMonths')}
                aria-invalid={errors.minLeaseDurationMonths ? "true" : "false"}
              />
              {errors.minLeaseDurationMonths && <p className="text-sm text-destructive mt-1">{errors.minLeaseDurationMonths.message}</p>}
            </div>
          )}
          
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


          <Alert variant="default" className="mt-4 bg-muted/40">
            <Percent className="h-4 w-4" />
            <AlertTitle className="text-sm font-medium">Service Fee Information</AlertTitle>
            <AlertDescription className="text-xs">
                LandShare applies a service fee to successful bookings.
                {currentSubscriptionOnMount === 'premium' ?
                " As a Premium member, you benefit from a reduced closing fee of 0.49% on your payouts." :
                " Free accounts are subject to a 2% closing fee on landowner payouts. Upgrade to Premium for lower fees and more benefits!"
                }
                <Link href="/pricing" className="underline ml-1 hover:text-primary">Learn more.</Link>
            </AlertDescription>
          </Alert>

        </CardContent>
        <CardFooter className="flex justify-between items-center gap-2">
          <div className="text-xs text-muted-foreground">
          </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => {form.reset({
              title: '', description: '', location: '', sizeSqft: 1000, price: 100, pricingModel: 'monthly',
              leaseToOwnDetails: '', amenities: [], images: [], leaseTerm: 'flexible', minLeaseDurationMonths: undefined,
              }); setPriceSuggestion(null); setPriceSuggestionError(null); setTitleSuggestion(null); setTitleSuggestionError(null); setSelectedFiles([]); setImagePreviews([]); setImageUploadError(null); setFormSubmittedSuccessfully(false); setSubmissionError(null); setSubmissionSuccess(null);}} disabled={isSubmitting || isPending}>Reset Form</Button>
            <Button type="submit" disabled={isActualSubmitButtonDisabled}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Listing
            </Button>
          </div>
        </CardFooter>
      </form>
      {submissionSuccess && submissionSuccess.listingId && formSubmittedSuccessfully && (
        <div className="p-4">
          <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-900/30">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-700 dark:text-green-300">Listing Created!</AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-400">
              {submissionSuccess.message}
              <Button asChild variant="link" className="ml-2 p-0 h-auto text-green-700 dark:text-green-300">
                <Link href={`/listings/${submissionSuccess.listingId}`}>View Your Listing</Link>
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
       {submissionError && (
        <div className="p-4 mt-4">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Creating Listing</AlertTitle>
                <AlertDescription>
                    {submissionError}
                </AlertDescription>
            </Alert>
        </div>
      )}
    </Card>
  );
}

