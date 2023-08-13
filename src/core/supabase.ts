import { createClient } from "@supabase/supabase-js"
import { Storage } from "@plasmohq/storage"

// this is the plasmo method
const storage = new Storage({
  area: "local"
})

const options = {
	auth: {
		storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
	}
}

// this is for the plamo storage method
export const supabasePlasmo = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_KEY, 
options
)

// this is for the manual method, supabaseManual
export const supabaseManual = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_KEY
)

// this options is for method 2
const optionsForMethod2 = {
  auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: {
          async getItem(key: string): Promise<string | null> {
              // @ts-ignore
              const storage = await chrome.storage.local.get(key);
              return storage?.[key];
          },
          async setItem(key: string, value: string): Promise<void> {
              // @ts-ignore
              await chrome.storage.local.set({
                  [key]: JSON.parse(value)
              });
          },
          async removeItem(key: string): Promise<void> {
              // @ts-ignore
              await chrome.storage.local.remove(key);
          }
      }
  }
}

// this is for supabaseAuto
export const supabaseAuto = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_KEY,
  optionsForMethod2
)

