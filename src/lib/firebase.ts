import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  setLogLevel,
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { ComicVolume, GiftCode, RedemptionHistory, Order, AcademyResource, AcademySettings } from '../types';
import { OCU_COMICS, INITIAL_GIFT_CODES, INITIAL_ACADEMY_RESOURCES, INITIAL_ACADEMY_SETTINGS } from '../data';

const firebaseConfig = {
  apiKey: "AIzaSyBJ13xjJmL-2fLicai7hbhFxnzsN5_MUi4",
  authDomain: "micro-territory-473615-b1.firebaseapp.com",
  projectId: "micro-territory-473615-b1",
  storageBucket: "micro-territory-473615-b1.firebasestorage.app",
  messagingSenderId: "1010014715163",
  appId: "1:1010014715163:web:13e4180253d9995acc27be"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Configure Firestore log verbosity to prevent noisy transient connection retry logs
setLogLevel('error');

// Initialize Firestore with robust long-polling and custom Database ID
export const db = initializeFirestore(
  app, 
  {
    experimentalForceLongPolling: true
  },
  "ai-studio-ocuofficialwebsi-fca0c4b4-61fc-46bb-a841-72a304c24442"
);

// Initialize Storage
export const storage = getStorage(app);

// ----------------- FIRESTORE ERROR HANDLING -----------------

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isPermError = 
    errMsg.includes('permission-denied') || 
    errMsg.includes('Missing or insufficient permissions');

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };

  if (isPermError) {
    console.error('Firestore Security Rule / Permission Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  } else {
    // Gracefully log network/offline unavailable warnings without crashing UI execution
    console.warn(`Firestore operation ${operationType} on ${path} unavailable (operating in offline/cached mode):`, errMsg);
  }
}

// ----------------- SEED DATA DEFINITIONS -----------------
const INITIAL_ORDERS: Order[] = [
  {
    id: 'OCU-182930-TX',
    comicId: 'genesis-void',
    comicTitle: 'Genesis of the Void',
    customerEmail: 'mohamedadhilathika@gmail.com',
    purchaseDate: '2026-07-01 14:32 UTC',
    price: 149,
    status: 'Completed',
    paymentStatus: 'Paid'
  },
  {
    id: 'OCU-984210-TX',
    comicId: 'vanguard-reborn',
    comicTitle: 'Vanguard Reborn',
    customerEmail: 'vanguard_fan_99@vanguard.org',
    purchaseDate: '2026-07-04 10:15 UTC',
    price: 199,
    status: 'Pending',
    paymentStatus: 'Paid'
  },
  {
    id: 'OCU-374182-TX',
    comicId: 'echoes-aetherion',
    comicTitle: 'Echoes of Aetherion',
    customerEmail: 'starlord_retro@nebula.com',
    purchaseDate: '2026-07-06 21:05 UTC',
    price: 249,
    status: 'Cancelled',
    paymentStatus: 'Refunded'
  }
];

// ----------------- FILE STORAGE UTILITIES -----------------

/**
 * Upload a file (Blob or File) to Firebase Storage and return its public Download URL.
 */
export async function uploadFileToStorage(folder: string, fileName: string, file: Blob | File): Promise<string> {
  const cleanFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const fileRef = ref(storage, `${folder}/${cleanFileName}`);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}

/**
 * Upload a file (Blob or File) to Firebase Storage with a progress callback and optional timeout.
 */
export function uploadFileToStorageWithProgress(
  folder: string,
  fileName: string,
  file: Blob | File,
  onProgress: (progress: number) => void,
  timeoutMs: number = 30000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const cleanFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const fileRef = ref(storage, `${folder}/${cleanFileName}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    const timeoutId = setTimeout(() => {
      uploadTask.cancel();
      reject(new Error('Upload timed out after 30 seconds. Please check your internet connection or try again.'));
    }, timeoutMs);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress(percent);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
      async () => {
        clearTimeout(timeoutId);
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * Delete a file from Firebase Storage given its absolute download URL.
 */
export async function deleteFileFromStorage(url: string): Promise<void> {
  if (!url || !url.startsWith('https://firebasestorage.googleapis.com')) return;
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (err) {
    console.error('Failed to delete file from Firebase Storage:', err);
  }
}

// ----------------- COMICS DATA ACCESS -----------------

export async function fetchComics(): Promise<ComicVolume[]> {
  const colRef = collection(db, 'comics');
  let snapshot;
  try {
    snapshot = await getDocs(colRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'comics');
  }
  
  if (!snapshot || snapshot.empty) {
    if (snapshot && snapshot.empty) {
      console.log('Comics collection is empty. Seeding Firestore with default comics catalog...');
      const batch = writeBatch(db);
      for (const comic of OCU_COMICS) {
        const docRef = doc(db, 'comics', comic.id);
        batch.set(docRef, comic);
      }
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'comics');
      }
    }
    return OCU_COMICS;
  }

  const list: ComicVolume[] = [];
  snapshot.forEach((d) => {
    list.push(d.data() as ComicVolume);
  });
  // Sort by volumeNumber
  return list.sort((a, b) => a.volumeNumber - b.volumeNumber);
}

export async function saveComicInFirestore(comic: ComicVolume): Promise<void> {
  const docRef = doc(db, 'comics', comic.id);
  try {
    await setDoc(docRef, comic, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `comics/${comic.id}`);
  }
}

export async function deleteComicFromFirestore(comicId: string): Promise<void> {
  const docRef = doc(db, 'comics', comicId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `comics/${comicId}`);
  }
}

// ----------------- GIFT CODES DATA ACCESS -----------------

export async function fetchGiftCodes(): Promise<GiftCode[]> {
  const colRef = collection(db, 'gift_codes');
  let snapshot;
  try {
    snapshot = await getDocs(colRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'gift_codes');
  }

  if (!snapshot || snapshot.empty) {
    if (snapshot && snapshot.empty) {
      console.log('Gift codes collection is empty. Seeding Firestore with initial codes...');
      const batch = writeBatch(db);
      for (const gift of INITIAL_GIFT_CODES) {
        const docRef = doc(db, 'gift_codes', gift.code);
        batch.set(docRef, gift);
      }
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'gift_codes');
      }
    }
    return INITIAL_GIFT_CODES;
  }

  const list: GiftCode[] = [];
  snapshot.forEach((d) => {
    list.push(d.data() as GiftCode);
  });
  return list;
}

export async function saveGiftCodeInFirestore(giftCode: GiftCode): Promise<void> {
  const docRef = doc(db, 'gift_codes', giftCode.code);
  try {
    await setDoc(docRef, giftCode, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `gift_codes/${giftCode.code}`);
  }
}

export async function deleteGiftCodeFromFirestore(code: string): Promise<void> {
  const docRef = doc(db, 'gift_codes', code);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `gift_codes/${code}`);
  }
}

// ----------------- REDEMPTION HISTORY DATA ACCESS -----------------

export async function fetchRedemptionHistory(): Promise<RedemptionHistory[]> {
  const colRef = collection(db, 'redemption_history');
  let snapshot;
  try {
    snapshot = await getDocs(colRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'redemption_history');
  }
  if (!snapshot) return [];
  const list: RedemptionHistory[] = [];
  snapshot.forEach((d) => {
    list.push(d.data() as RedemptionHistory);
  });
  return list.sort((a, b) => b.redeemedAt.localeCompare(a.redeemedAt));
}

export async function saveRedemptionHistoryInFirestore(item: RedemptionHistory): Promise<void> {
  const docRef = doc(db, 'redemption_history', item.id);
  try {
    await setDoc(docRef, item);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `redemption_history/${item.id}`);
  }
}

export async function clearRedemptionHistoryInFirestore(): Promise<void> {
  const colRef = collection(db, 'redemption_history');
  let snapshot;
  try {
    snapshot = await getDocs(colRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'redemption_history');
  }
  if (!snapshot || snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.forEach((d) => {
    batch.delete(d.ref);
  });
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'redemption_history');
  }
}

// ----------------- ORDERS DATA ACCESS -----------------

export async function fetchOrders(): Promise<Order[]> {
  const colRef = collection(db, 'orders');
  let snapshot;
  try {
    snapshot = await getDocs(colRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'orders');
  }

  if (!snapshot || snapshot.empty) {
    if (snapshot && snapshot.empty) {
      console.log('Orders collection is empty. Seeding Firestore with default orders registry...');
      const batch = writeBatch(db);
      for (const order of INITIAL_ORDERS) {
        const docRef = doc(db, 'orders', order.id);
        batch.set(docRef, order);
      }
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'orders');
      }
    }
    return INITIAL_ORDERS;
  }

  const list: Order[] = [];
  snapshot.forEach((d) => {
    list.push(d.data() as Order);
  });
  return list.sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
}

export async function saveOrderInFirestore(order: Order): Promise<void> {
  const docRef = doc(db, 'orders', order.id);
  try {
    await setDoc(docRef, order, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `orders/${order.id}`);
  }
}

// ----------------- ACADEMY MANAGEMENT DATA ACCESS -----------------

export async function fetchAcademySettings(): Promise<AcademySettings> {
  try {
    const docSnap = await getDocs(query(collection(db, 'academy_settings')));
    if (docSnap && !docSnap.empty) {
      const found = docSnap.docs.find(d => d.id === 'main_config');
      if (found) {
        return found.data() as AcademySettings;
      }
    }
  } catch (err) {
    console.warn('Firestore fetch academy_settings notice:', err);
  }
  return INITIAL_ACADEMY_SETTINGS;
}

export async function saveAcademySettingsInFirestore(settings: AcademySettings): Promise<void> {
  const docRef = doc(db, 'academy_settings', 'main_config');
  try {
    await setDoc(docRef, { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'academy_settings/main_config');
  }
}

export async function fetchAcademyResources(): Promise<AcademyResource[]> {
  const colRef = collection(db, 'academy_resources');
  let snapshot;
  try {
    snapshot = await getDocs(colRef);
  } catch (err) {
    console.warn('Firestore fetch academy_resources notice:', err);
  }

  // Check if we have documents in Firestore
  if (snapshot && !snapshot.empty) {
    const list: AcademyResource[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as AcademyResource);
    });
    return list;
  }

  // Check local cache if user previously deleted or updated items
  const hasEverInitialized = typeof window !== 'undefined' ? localStorage.getItem('ocu_academy_initialized') : null;
  const cached = typeof window !== 'undefined' ? localStorage.getItem('ocu_academy_resources') : null;
  if (hasEverInitialized && cached !== null) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  // First time initialization: seed Firestore with initial resources so each has a persistent document
  if (snapshot && snapshot.empty && !hasEverInitialized) {
    try {
      const batch = writeBatch(db);
      for (const res of INITIAL_ACADEMY_RESOURCES) {
        const docRef = doc(db, 'academy_resources', res.id);
        batch.set(docRef, res);
      }
      await batch.commit();
      if (typeof window !== 'undefined') {
        localStorage.setItem('ocu_academy_initialized', 'true');
      }
    } catch (seedErr) {
      console.warn('Could not seed initial academy resources in Firestore:', seedErr);
    }
    return INITIAL_ACADEMY_RESOURCES;
  }

  // If fetch failed or network offline, return cached or initial resources
  if (cached !== null) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  return INITIAL_ACADEMY_RESOURCES;
}

export async function saveAcademyResourceInFirestore(resource: AcademyResource): Promise<void> {
  const docRef = doc(db, 'academy_resources', resource.id);
  try {
    await setDoc(docRef, { ...resource, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `academy_resources/${resource.id}`);
  }
}

export async function deleteAcademyResourceFromFirestore(resourceId: string): Promise<void> {
  const docRef = doc(db, 'academy_resources', resourceId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`Could not delete academy resource ${resourceId} from Firestore:`, err);
  }
}

