
'use client';

import { useEffect, useState, useTransition, ChangeEvent, useActionState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Added useRouter

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Info, Loader2, CheckCircle, AlertCircle, CalendarClock, UserCircle, Percent, UploadCloud, Trash2, FileImage, Lightbulb } from 'lucide-react';
import { useToast, toast as shadToastHook } from '@/hooks/use-toast'; // Renamed toast import to avoid conflict
import { ToastAction } from "@/components/ui/toast"; // Added ToastAction
import { useAuth } from '@/contexts/auth-context';

import { getSuggestedPriceAction, getSuggestedTitleAction } from '@/lib/actions/ai-actions';
import { createListingAction, type ListingFormState } from '@/app/(app)/listings/new/actions';
import type { PriceSuggestionInput, PriceSuggestionOutput, LeaseTerm, SuggestListingTitleInput, SuggestListingTitleOutput } from '@/lib/types';
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

const initialFormState: ListingFormState = { message: '', success: false };

export function ListingForm() {
  const { currentUser, loading: authLoading, subscriptionStatus } = useAuth();
  const { toast } = useToast(); // Using the destructured toast from our hook
  const router = useRouter(); // Initialized useRouter

  const [formState, formAction] = useActionState(createListingAction, initialFormState);
  const [isPending, startTransition] = useTransition();

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
  };

 useEffect(() => {
    if (formState.message && !isPending) {
      if (formState.success) {
        if (!formSubmittedSuccessfully) {
          toast({
            title: "Success!",
            description: formState.message,
            variant: "default",
            action: formState.listingId ? (
              <ToastAction
                altText="View Listing"
                onClick={() => router.push(`/listings/${formState.listingId}`)}
              >
                View
              </ToastAction>
            ) : undefined,
          });
          form.reset({
            title: '', description: '', location: '', sizeSqft: 1000, price: 100, pricingModel: 'monthly',
            leaseToOwnDetails: '', amenities: [], images: [], leaseTerm: 'flexible', minLeaseDurationMonths: undefined,
          });
          setPriceSuggestion(null);
          setPriceSuggestionError(null);
          setTitleSuggestion(null);
          setTitleSuggestionError(null);
          setSelectedFiles([]);
          setImagePreviews([]);
          setImageUploadError(null);
          setFormSubmittedSuccessfully(true);
        }
      } else {
        toast({
          title: "Error Creating Listing",
          description: formState.message || "An unknown error occurred.",
          variant: "destructive",
        });
        setFormSubmittedSuccessfully(false);
      }
    }
  }, [formState, isPending, toast, form, formSubmittedSuccessfully, router]);

  useEffect(() => {
    if (formSubmittedSuccessfully && form.formState.isDirty) {
      setFormSubmittedSuccessfully(false);
    }
  }, [form.formState.isDirty, formSubmittedSuccessfully]);


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
      if (imagePreviews[index]) {
        URL.revokeObjectURL(imagePreviews[index]);
      }
      return newPreviews;
    });
  };

  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);


  const onSubmit = async (data: ListingFormData) => {
    if (authLoading || !currentUser?.uid || currentUser.uid.trim() === '') {
      toast({
        title: "Form Submission Blocked",
        description: `Auth Loading: ${authLoading}. User UID: ${currentUser?.uid || 'Not available'}. Please ensure you are fully logged in.`,
        variant: "destructive",
        duration: 7000,
      });
      return;
    }
    
    const uploadedImageUrls = imagePreviews; 
    const formDataToSubmit = new FormData();

    formDataToSubmit.append('landownerId', currentUser.uid); 

    const { ...listingDataForDb } = data;
    const submissionData = { ...listingDataForDb, images: uploadedImageUrls };


    Object.entries(submissionData).forEach(([key, value]) => {
      if (key === 'amenities' && Array.isArray(value)) {
        value.forEach(amenity => formDataToSubmit.append(key, amenity));
      } else if (key === 'images' && Array.isArray(value)) {
        value.forEach(imgUrl => formDataToSubmit.append(key, imgUrl as string));
      } else if (key === 'minLeaseDurationMonths' && (value === undefined || value === null) && watchedLeaseTerm !== 'flexible') {
        // Don't append if not relevant or not set for non-flexible terms
      } else if (value !== undefined && value !== null) {
        formDataToSubmit.append(key, String(value));
      }
    });
    
    if(selectedFiles.length > 0 && uploadedImageUrls.every(url => url.startsWith("blob:"))){
        toast({
            title: "Image Upload Note",
            description: "Image selection is for demonstration. Actual file uploads to cloud storage and URL generation for listings require separate backend implementation. Using preview URLs as placeholders.",
            duration: 7000,
        });
    }

    setFormSubmittedSuccessfully(false); 
    startTransition(() => {
      formAction(formDataToSubmit);
    });
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

  const isSubmitButtonDisabled = isPending || authLoading || !currentUser?.uid || currentUser.uid.trim() === '';


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
                    disabled={isTitleSuggestionLoading || !watchedLocation || (!watchedDescription && watchedAmenities?.length === 0)}
                    title="Suggest Title with AI"
                >
                    {isTitleSuggestionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4 text-yellow-500" />}
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
                <Input id="image-upload" type="file" multiple accept="image/*" className="sr-only" onChange={handleFileChange} disabled={selectedFiles.length >= MAX_IMAGES} />
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
                {selectedFiles.length < MAX_IMAGES && (
                  <label htmlFor="image-upload" className="aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer hover:border-primary text-muted-foreground hover:text-primary transition-colors">
                    <FileImage className="h-8 w-8"/>
                    <span className="text-xs mt-1">Add more</span>
                  </label>
                )}
              </div>
            )}
             {errors.images && <p className="text-sm text-destructive mt-1">{errors.images.message}</p>}
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
                      disabled={isPriceSuggestionLoading || !watchedLocation || !watchedSizeSqft || watchedSizeSqft <= 0}
                      title="Suggest Price with AI (for monthly rates)"
                  >
                      {isPriceSuggestionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-accent" />}
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
              }); setPriceSuggestion(null); setPriceSuggestionError(null); setTitleSuggestion(null); setTitleSuggestionError(null); setSelectedFiles([]); setImagePreviews([]); setImageUploadError(null); setFormSubmittedSuccessfully(false);}} disabled={isPending}>Reset Form</Button>
            <Button type="submit" disabled={isSubmitButtonDisabled}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Listing
            </Button>
          </div>
        </CardFooter>
      </form>
      {formState.success && formState.listingId && formSubmittedSuccessfully && (
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
