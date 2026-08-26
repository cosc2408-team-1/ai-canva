import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBP1H4V8oAZucSKWDuYRT1EpeoeC9IyQHU",
  authDomain: "ai-canva-e9dff.firebaseapp.com",
  projectId: "ai-canva-e9dff",
  storageBucket: "ai-canva-e9dff.firebasestorage.app",
  messagingSenderId: "515518523006",
  appId: "1:515518523006:web:687b983976e0ed9bd65a2f"
};

const app = initializeApp(firebaseConfig);

// Use localStorage for Auth persistence instead of the default IndexedDB.
// This avoids conflicts between Auth's IndexedDB and Firestore's IndexedDB cache.
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);

export { auth };
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
