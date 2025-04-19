import { initializeApp } from "firebase/app"
import { getDatabase, ref, set, remove, update } from "firebase/database"

// Add new function
export function updateGameState(code: string, updates: any) {
  return update(getGameStateRef(code), updates)
}
import { useDatabaseObject } from "vuefire"

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

// Helper to get a reference to a game state by code
export function getGameStateRef(code: string) {
  return ref(db, `/gamestate/${code}`)
}

// VueFire composable for a game state (reactive binding)
export function useGameState(code: string) {
  return useDatabaseObject(getGameStateRef(code))
}

// Set (overwrite) game state
export function setGameState(code: string, data: any) {
  return set(getGameStateRef(code), data)
}

// Remove game state
export function deleteGameState(code: string) {
  return remove(getGameStateRef(code))
}
