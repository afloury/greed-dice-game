import { ref, computed } from "vue"
import en from "./en"
import fr from "./fr"

// Define type for translation objects
interface TranslationObject {
  [key: string]: string | TranslationObject | Record<string, string>
}

// Create a shared state for language preference (singleton pattern)
const isEnglish = ref(true)

export function useI18n() {
  // Get the current locale
  const locale = computed(() => (isEnglish.value ? "en" : "fr"))

  // Access to the locale for components that need it directly
  const toggleLanguage = () => {
    isEnglish.value = !isEnglish.value
  }

  // Get translation messages based on current locale
  const messages = computed<TranslationObject>(() => {
    return isEnglish.value ? en : fr
  })

  // Translate a key with optional string formatting for parameters
  // Example: t('greeting', ['John']) where greeting is "Hello, {0}!"
  const t = (key: string, params: any[] = []): string => {
    // Split the key by dots to handle nested objects
    const keys = key.split(".")
    let value: any = messages.value

    // Navigate through the nested keys
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k]
      } else {
        console.warn(`Translation key not found: ${key}`)
        return key // Return the key if translation is missing
      }
    }

    // If the value is a string, format it with parameters
    if (typeof value === "string") {
      return formatString(value, params)
    }

    return String(value)
  }

  // Format a string by replacing {0}, {1}, etc. with corresponding parameters
  const formatString = (str: string, params: any[]): string => {
    if (!params || !params.length) return str

    return str.replace(/{(\d+)}/g, (match, index) => {
      return typeof params[parseInt(index)] !== "undefined"
        ? String(params[parseInt(index)])
        : match
    })
  }

  return {
    locale,
    isEnglish,
    toggleLanguage,
    t,
  }
}
