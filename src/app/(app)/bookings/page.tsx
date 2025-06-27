
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Briefcase, CheckCircle, XCircle, AlertTriangle, Loader2, UserCircle, FileText, Download, ExternalLink, CalendarPlus, Undo2, BadgeCheck } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import type { Booking, GenerateLeaseTermsInput } from '@/lib/types';
import { getBookingsForUser, updateBookingStatus as dbUpdateBookingStatus, getListingById, populateBookingDetails } from '@/lib/mock-data';
import { format, differenceInDays, differenceInCalendarMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { firebaseInitializationError, db as firestoreDb } from '@/lib/firebase';
import { getGeneratedLeaseTermsAction } from '@/lib/actions/ai-actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import jsPDF from 'jspdf';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from 'firebase/firestore';

export default function BookingsPage() {
  const { currentUser, loading: authLoading, refreshUserProfile } = useAuth();
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeaseTermsLoading, setIsLeaseTermsLoading] = useState<Record<string, boolean>>({});
  const [isStatusUpdating, setIsStatusUpdating] = useState<Record<string, boolean>>({});
  const [leaseTermsModalOpen, setLeaseTermsModalOpen] = useState(false);
  const [currentLeaseTerms, setCurrentLeaseTerms] = useState<string | null>(null);
  const [currentLeaseSummary, setCurrentLeaseSummary] = useState<string[] | null>(null);
  const [currentBookingForLease, setCurrentBookingForLease] = useState<Booking | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const loadBookings = useCallback(async () => {
    if (firebaseInitializationError && !currentUser?.appProfile) {
      setIsLoading(false);
      setUserBookings([]);
      return;
    }

    setIsLoading(true);

    try {
      if (!currentUser) {
        setUserBookings([]);
        setIsLoading(false);
        return;
      }
      let bookingsFromDb = await getBookingsForUser(currentUser.uid);
      // Ensure booking details are populated for display, especially in mock mode
      if (firebaseInitializationError) {
        bookingsFromDb = await Promise.all(bookingsFromDb.map(b => populateBookingDetails(b)));
      }
      setUserBookings(bookingsFromDb);
    } catch (error: any) {
      console.error("Failed to load bookings:", error);
      toast({
        title: "Loading Failed",
        description: error.message || "Could not load your bookings.",
        variant: "destructive",
      });
      setUserBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadBookings();
    } else if (!authLoading && !currentUser) {
      setIsLoading(false);
      setUserBookings([]);
    }
  }, [authLoading, currentUser, loadBookings]);


  const uploadLeaseToStorage = async (pdfBlob: Blob, booking: Booking) => {
    if (!currentUser || !booking || !booking.listingId || (!firestoreDb && !firebaseInitializationError)) {
      toast({ title: "Error", description: "Cannot save lease without user, booking info, or DB connection.", variant: "destructive" });
      return;
    }
    if (firebaseInitializationError) {
       toast({ title: "Preview Mode", description: "Lease upload is disabled in preview mode.", variant: "default" });
       return;
    }

    toast({ title: "Saving Lease...", description: "Uploading lease to secure storage." });
    try {
      const storage = getStorage();
      const filePath = `leaseContracts/${booking.id}/lease-agreement-${Date.now()}.pdf`;
      const sRef = storageRef(storage, filePath);

      const metadata = {
        customMetadata: {
          bookingId: booking.id,
          renterId: booking.renterId,
          landownerId: booking.landownerId,
          listingId: booking.listingId,
        }
      };

      const snapshot = await uploadBytes(sRef, pdfBlob, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const bookingDocRef = doc(firestoreDb!, "bookings", booking.id);
      await updateDoc(bookingDocRef, {
        leaseContractPath: snapshot.ref.fullPath,
        leaseContractUrl: downloadURL
      });

      toast({ title: "Lease Saved!", description: "The lease agreement has been securely saved to the cloud." });
      await refreshUserProfile(); // Refresh data to show new link and any other state changes
    } catch (error: any) {
      console.error("Error uploading lease:", error);
      toast({ title: "Save Failed", description: `Could not save lease: ${error.message}`, variant: "destructive" });
    }
  };


  const handleGenerateAndShowLeaseTerms = async (booking: Booking) => {
    if (!currentUser || !booking.listingTitle || !booking.renterName || !booking.landownerName) {
        toast({title: "Missing Data", description: "Cannot generate lease terms due to missing booking details.", variant: "destructive"});
        return;
    }
    setIsLeaseTermsLoading(prev => ({ ...prev, [booking.id]: true }));
    setCurrentBookingForLease(booking);

    const listingDetails = await getListingById(booking.listingId);
    if (!listingDetails) {
        toast({title: "Error", description: "Could not fetch listing details for lease terms.", variant: "destructive"});
        setIsLeaseTermsLoading(prev => ({ ...prev, [booking.id]: false }));
        return;
    }

    const fromDate = booking.dateRange.from instanceof Date ? booking.dateRange.from : (booking.dateRange.from as any).toDate();
    const toDate = booking.dateRange.to instanceof Date ? booking.dateRange.to : (booking.dateRange.to as any).toDate();

    let durationDesc = "";
    let priceForLeaseTerm = listingDetails.price;

    if (listingDetails.pricingModel === 'nightly') {
        const days = differenceInDays(toDate, fromDate) + 1;
        durationDesc = `${days} day(s) nightly rental`;
        priceForLeaseTerm = listingDetails.price * days;
    } else if (listingDetails.pricingModel === 'monthly') {
        const days = differenceInDays(toDate, fromDate) + 1;
        if (days < 28 && listingDetails.minLeaseDurationMonths && listingDetails.minLeaseDurationMonths > 0) {
             const approxMonths = (days / 30).toFixed(1);
             durationDesc = `${days} day(s) (approx ${approxMonths} months) - Short-term on monthly plot`;
             priceForLeaseTerm = (listingDetails.price / 30) * days;
        } else {
             const fullMonths = differenceInCalendarMonths(endOfMonth(toDate), startOfMonth(fromDate)) + 1;
             durationDesc = `${fullMonths} month(s)`;
             priceForLeaseTerm = listingDetails.price * fullMonths;
        }
    } else if (listingDetails.pricingModel === 'lease-to-own') {
        const fullMonths = differenceInCalendarMonths(endOfMonth(toDate), startOfMonth(fromDate)) + 1;
        durationDesc = `${fullMonths} month(s) (under Lease-to-Own terms)`;
        priceForLeaseTerm = listingDetails.price * fullMonths;
    }

    const input: GenerateLeaseTermsInput = {
        listingType: `${listingDetails.title} (${listingDetails.pricingModel})`,
        durationDescription: durationDesc,
        pricePerMonthEquivalent: priceForLeaseTerm,
        landownerName: booking.landownerName,
        renterName: booking.renterName,
        listingAddress: listingDetails.location,
        additionalRules: listingDetails.leaseToOwnDetails || listingDetails.amenities.join(', ') || "Standard property usage rules apply. Maintain cleanliness."
    };

    const result = await getGeneratedLeaseTermsAction(input);
    setIsLeaseTermsLoading(prev => ({ ...prev, [booking.id]: false }));

    if (result.data) {
        setCurrentLeaseTerms(result.data.leaseAgreementText);
        setCurrentLeaseSummary(result.data.summaryPoints);
        setLeaseTermsModalOpen(true);
    } else {
        toast({title: "AI Lease Generation Error", description: result.error || "Failed to generate lease terms.", variant: "destructive", duration: 7000});
    }
  };

  const handleDownloadAndStoreLeasePdf = async () => {
    if (!currentLeaseTerms || !currentBookingForLease) {
      toast({title: "Error", description: "No lease terms available to process.", variant: "destructive"});
      return;
    }
    try {
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15; // mm
      const lineHeight = 5; // mm, adjust based on font size
      let y = margin;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Lease Agreement Suggestion", pageWidth / 2, y, { align: "center" });
      y += lineHeight * 2;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      const lines = doc.splitTextToSize(currentLeaseTerms, pageWidth - margin * 2);
      
      lines.forEach((line: string) => {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        if (line.startsWith("**") && line.endsWith("**")) {
            doc.setFont("helvetica", "bold");
            doc.text(line.substring(2, line.length - 2), margin, y);
            doc.setFont("helvetica", "normal");
        } else {
            doc.text(line, margin, y);
        }
        y += lineHeight;
      });

      // First, trigger download for the user
      doc.save(`LandShare_Lease_Suggestion_${currentBookingForLease.listingTitle?.replace(/\s+/g, '_') || currentBookingForLease.listingId}.pdf`);
      toast({title: "PDF Downloaded", description: "Lease suggestion PDF has been downloaded."});

      // Then, upload to Firebase Storage
      const pdfBlob = doc.output('blob');
      await uploadLeaseToStorage(pdfBlob, currentBookingForLease);
      // The uploadLeaseToStorage function will show its own toast and refresh bookings

    } catch (error: any) {
      console.error("Error processing PDF:", error);
      toast({title: "PDF Processing Failed", description: error.message || "Could not process PDF.", variant: "destructive"});
    }
  };


  const handleUpdateBookingStatus = async (booking: Booking, newStatus: Booking['status']) => {
    if (firebaseInitializationError && !currentUser?.appProfile) {
        toast({ title: "Preview Mode", description: "Updating booking status is disabled in full preview mode.", variant: "default" });
        return;
    }
    if(!currentUser){
         toast({ title: "Authentication Error", description: "User not logged in.", variant: "destructive"});
        return;
    }

    setIsStatusUpdating(prev => ({ ...prev, [booking.id]: true }));
    try {
      const updatedBooking = await dbUpdateBookingStatus(booking.id, newStatus);
      if (updatedBooking) {
        let toastDescription = `Booking status changed to ${newStatus}.`;
        if (newStatus === 'Cancelled by Renter') {
          toastDescription = "Your booking has been cancelled. No refund is automatically issued.";
        } else if (newStatus === 'Refund Requested') {
          toastDescription = "A refund has been requested. The landowner will review it.";
        } else if (newStatus === 'Refund Approved') {
            toastDescription = "Refund approved! The transaction will be reversed.";
        }
        toast({ title: "Booking Updated", description: toastDescription });
        
        // This is the key change: refreshing the global user profile triggers updates everywhere
        await refreshUserProfile(); 

        if (newStatus === 'Confirmed' && currentUser.uid === booking.landownerId) {
            const freshlyLoadedBooking = await getBookingsForUser(currentUser.uid).then(bs => bs.find(b => b.id === booking.id && b.status === 'Confirmed'));
            if (freshlyLoadedBooking) {
                 await handleGenerateAndShowLeaseTerms(freshlyLoadedBooking);
            }
        }
      } else {
        throw new Error("Update operation returned undefined or failed.");
      }
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message || "Could not update booking status.", variant: "destructive" });
      await refreshUserProfile(); // Ensure UI consistency even on failure
    } finally {
        setIsStatusUpdating(prev => ({ ...prev, [booking.id]: false }));
    }
  };

  const getStatusColor = (status: Booking['status']) => {
    if (status.includes('Confirmed')) return 'text-primary';
    if (status.includes('Pending')) return 'text-accent';
    if (status.includes('Refund Approved')) return 'text-blue-500';
    if (status.includes('Refund Requested')) return 'text-amber-600';
    if (status.includes('Declined') || status.includes('Cancelled')) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const formatDateRange = (dateRange: { from: Date | { toDate: () => Date }; to: Date | { toDate: () => Date } }): string => {
    const fromDate = dateRange.from instanceof Date ? dateRange.from : (dateRange.from as any).toDate();
    const toDate = dateRange.to instanceof Date ? dateRange.to : (dateRange.to as any).toDate();
    return `${format(fromDate, "PPP")} - ${format(toDate, "PPP")}`;
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading bookings...</p>
      </div>
    );
  }

  if (!currentUser && !authLoading && !isLoading) {
     return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"> <UserCircle className="h-6 w-6 text-primary" /> Please Log In </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground"> You need to be logged in to view your bookings. </p>
          <Button asChild className="mt-4"> <Link href="/login">Log In</Link> </Button>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold"> My Bookings & Requests </h1>
         <Button asChild> <Link href="/search"> <Briefcase className="mr-2 h-4 w-4" /> Find New Land </Link> </Button>
      </div>

      {userBookings.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"> <CalendarCheck className="h-6 w-6 text-primary" /> No Bookings Yet </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground"> You don't have any active bookings or requests at the moment. {firebaseInitializationError && " (Firebase features may be limited if not configured.)"} </p>
            <div className="flex gap-2 mt-4">
                <Button asChild> <Link href="/search">Explore Land</Link> </Button>
                <Button asChild variant="outline"> <Link href="/my-listings">View My Listings</Link> </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {userBookings.map((booking) => (
            <Card key={booking.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{booking.listingTitle || `Listing: ${booking.listingId.substring(0,10)}...`}</CardTitle>
                <CardDescription> Status: <span className={`font-semibold ${getStatusColor(booking.status)}`}>{booking.status}</span> </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm"><strong>Dates:</strong> {formatDateRange(booking.dateRange as { from: Date; to: Date })}</p>
                {currentUser && booking.landownerId === currentUser.uid && ( <p className="text-sm"><strong>Renter:</strong> {booking.renterName || `Renter ID: ${booking.renterId.substring(0,6)}`}</p> )}
                {currentUser && booking.renterId === currentUser.uid && ( <p className="text-sm"><strong>Landowner:</strong> {booking.landownerName || `Owner ID: ${booking.landownerId.substring(0,6)}`}</p> )}
                {booking.leaseContractUrl && booking.status === 'Confirmed' && (
                    <Button variant="link" size="sm" asChild className="p-0 h-auto text-primary">
                        <Link href={booking.leaseContractUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1 h-3 w-3"/> View Stored Lease
                        </Link>
                    </Button>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild> <Link href={`/listings/${booking.listingId}`}>View Listing</Link> </Button>
                
                {/* Landowner Actions */}
                {currentUser?.uid === booking.landownerId && (
                    <>
                        {booking.status === 'Pending Confirmation' && (
                            <>
                                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => handleUpdateBookingStatus(booking, 'Confirmed')} disabled={isStatusUpdating[booking.id]} >
                                {isStatusUpdating[booking.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} Approve
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleUpdateBookingStatus(booking, 'Declined')} disabled={isStatusUpdating[booking.id]} >
                                {isStatusUpdating[booking.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" /> } Decline
                                </Button>
                            </>
                        )}
                        {booking.status === 'Refund Requested' && (
                             <Button variant="secondary" className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={() => handleUpdateBookingStatus(booking, 'Refund Approved')} disabled={isStatusUpdating[booking.id]} >
                                {isStatusUpdating[booking.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BadgeCheck className="mr-2 h-4 w-4" />} Approve Refund
                            </Button>
                        )}
                    </>
                )}
                
                {/* Renter Actions */}
                {currentUser?.uid === booking.renterId && (
                    <>
                        {booking.status === 'Pending Confirmation' && (
                            <Button variant="destructive" size="sm" onClick={() => handleUpdateBookingStatus(booking, 'Cancelled by Renter')} disabled={isStatusUpdating[booking.id]} >
                                {isStatusUpdating[booking.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />} Cancel Request
                            </Button>
                        )}
                        {booking.status === 'Confirmed' && (
                            <>
                                <Button variant="destructive" size="sm" onClick={() => handleUpdateBookingStatus(booking, 'Cancelled by Renter')} disabled={isStatusUpdating[booking.id]} >
                                    {isStatusUpdating[booking.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />} Cancel Booking
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => {toast({title: "Simulating Extension", description: "To extend your stay, please book the additional dates on the listing page.", duration: 6000}); router.push(`/listings/${booking.listingId}`)}} >
                                    <CalendarPlus className="mr-2 h-4 w-4"/> Extend Stay
                                </Button>
                            </>
                        )}
                        {(booking.status === 'Cancelled by Renter' || booking.status === 'Declined') && (
                             <Button variant="secondary" size="sm" onClick={() => handleUpdateBookingStatus(booking, 'Refund Requested')} disabled={isStatusUpdating[booking.id]} >
                                {isStatusUpdating[booking.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Undo2 className="mr-2 h-4 w-4" />} Request Refund
                            </Button>
                        )}
                    </>
                )}

                {/* Shared Actions */}
                {booking.status === 'Confirmed' && !booking.leaseContractUrl && (
                     <Button variant="secondary" size="sm" onClick={() => handleGenerateAndShowLeaseTerms(booking)} disabled={isLeaseTermsLoading[booking.id] || isStatusUpdating[booking.id]}>
                        {isLeaseTermsLoading[booking.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                        Get Lease Suggestion
                    </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={leaseTermsModalOpen} onOpenChange={setLeaseTermsModalOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary"/>AI Suggested Lease Terms</AlertDialogTitle>
            <AlertDialogDescription>
              This is an AI-generated lease suggestion based on the booking details.
              <strong> It is for informational purposes only and should be reviewed by legal counsel before use. Ensure compliance with all local and state laws.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-1 pr-4 custom-scrollbar text-sm space-y-4">
            {currentLeaseSummary && currentLeaseSummary.length > 0 && (
                <div className="mb-4 p-3 bg-muted/50 rounded-md">
                    <h3 className="font-semibold mb-2 text-foreground">Key Summary Points:</h3>
                    <ul className="list-disc list-inside space-y-1">
                        {currentLeaseSummary.map((point, idx) => <li key={idx}>{point}</li>)}
                    </ul>
                </div>
            )}
            <pre className="whitespace-pre-wrap font-sans bg-card p-4 rounded-md border">
                {currentLeaseTerms || "No lease terms generated or an error occurred."}
            </pre>
          </div>
          <AlertDialogFooter className="gap-2 flex-row justify-end">
            <Button variant="outline" onClick={handleDownloadAndStoreLeasePdf} disabled={!currentLeaseTerms || !currentBookingForLease || (firebaseInitializationError !== null)}>
                <Download className="mr-2 h-4 w-4"/> Download & Save to Cloud
            </Button>
            <AlertDialogAction onClick={() => setLeaseTermsModalOpen(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="mt-8 bg-muted/30">
        <CardHeader> <CardTitle className="text-lg">Booking Management Tip</CardTitle> </CardHeader>
        <CardContent> <p className="text-sm text-muted-foreground"> Respond to booking requests promptly. Renters can now cancel confirmed bookings or pending requests. After cancelling, renters have the option to request a refund, which landowners can then approve. Approved refunds will reverse the associated transactions. </p> </CardContent>
      </Card>
    </div>
  );
}
