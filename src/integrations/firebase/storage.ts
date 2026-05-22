import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadMetadata,
} from "firebase/storage";
import { storage } from "./client";

export { ref, getDownloadURL, deleteObject };

/**
 * Upload a file to Firebase Storage.
 * @param path  e.g. "payment-receipts/userId/filename.jpg"
 * @param file  The File or Blob to upload
 * @param metadata  Optional content type etc.
 * @returns Public download URL
 */
export async function uploadFile(
  path: string,
  file: File | Blob,
  metadata?: UploadMetadata
): Promise<string> {
  const storageRef = ref(storage, path);
  const snap = await uploadBytes(storageRef, file, metadata);
  return getDownloadURL(snap.ref);
}

/**
 * Upload with progress callback.
 */
export function uploadFileWithProgress(
  path: string,
  file: File | Blob,
  onProgress: (percent: number) => void,
  metadata?: UploadMetadata
): Promise<string> {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file, metadata);
    task.on(
      "state_changed",
      (snap) => onProgress((snap.bytesTransferred / snap.totalBytes) * 100),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref))
    );
  });
}

/**
 * Delete a file by its full storage path.
 */
export async function deleteFile(path: string): Promise<void> {
  await deleteObject(ref(storage, path));
}
