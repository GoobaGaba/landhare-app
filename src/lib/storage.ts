
'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app, firebaseInitializationError } from './firebase';

if (!app && !firebaseInitializationError) {
  throw new Error("Firebase has not been initialized. Please check your configuration.");
}

const storage = firebaseInitializationError ? null : getStorage(app!);

// Generates a unique file name to avoid collisions
const generateUniqueFileName = (userId: string, fileName: string) => {
  const fileExt = fileName.split('.').pop();
  const randomString = Math.random().toString(36).substring(2, 10);
  return `${userId}-${Date.now()}-${randomString}.${fileExt}`;
};


/**
 * Uploads an image file to a dedicated path in Firebase Storage.
 * @param file The image file to upload.
 * @param userId The ID of the user uploading the file, to organize storage paths.
 * @param listingId A temporary or final ID for the listing to further organize.
 * @returns The public downloadable URL of the uploaded image.
 */
export const uploadListingImage = async (
  file: File,
  userId: string,
  listingId: string = 'temp' // Use a temporary ID during initial upload
): Promise<string> => {
  if (!storage) {
    console.warn("Firebase Storage is not available. Returning a placeholder.");
    // In mock mode, we just return a placeholder after a fake delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return `https://placehold.co/600x400.png?text=${encodeURIComponent(file.name.substring(0,10))}`;
  }

  const uniqueFileName = generateUniqueFileName(userId, file.name);
  const storagePath = `listings/${listingId}/${uniqueFileName}`;
  const imageRef = ref(storage, storagePath);

  try {
    const snapshot = await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image to Firebase Storage:", error);
    throw new Error("Image upload failed. Please try again.");
  }
};
