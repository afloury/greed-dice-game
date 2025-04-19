import { initializeApp } from "firebase/app"
import { getDatabase, ref, set, remove } from "firebase/database"
import { useDatabaseObject } from "vuefire"
// ... other firebase imports

export const firebaseApp = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
})

// used for the firestore refs
export const db = getDatabase(firebaseApp)

export const myObject = useDatabaseObject(ref(db, "ant/test"))

export const updateObject = (data: any) => {
  set(ref(db, "ant/test"), data)
}

export const deleteObject = () => {
  remove(ref(db, "ant/test"))
}
