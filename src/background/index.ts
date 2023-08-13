import { supabaseManual as supabase, supabaseAuto } from "~core/supabase"

// init chrome storage keys
const chromeStorageKeys = {
  supabaseAccessToken: "supabaseAccessToken",
  supabaseRefreshToken: "supabaseRefreshToken",
  supabaseUserData: "supabaseUserData",
  supabaseExpiration: "supabaseExpiration",
  supabaseUserId: "supabaseUserId"
}

// get the supabase keys
async function getSupabaseKeys() {
  const supabaseAccessToken = await getKeyFromStorage(
    chromeStorageKeys.supabaseAccessToken
  )
  const supabaseExpiration = (await getKeyFromStorage(
    chromeStorageKeys.supabaseExpiration
  )) as number
  const userId = await getKeyFromStorage(chromeStorageKeys.supabaseUserId)

  return { supabaseAccessToken, supabaseExpiration, userId }
}

// basic function
async function getKeyFromStorage(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve(result[key])
      }
    })
  })
}

// validate the token
async function validateToken(supabaseAccessToken, supabaseExpiration) {
  const currentTime = Math.floor(Date.now() / 1000)
  if (!supabaseAccessToken) {
    throw new Error("No Supabase access token found")
  }
  if (currentTime > supabaseExpiration) {
    //   handleMessage({ action: "refresh", value: null })
    throw new Error("Supabase access token is expired")
  }
}

//setting keys in local storage
async function setKeyInStorage(
  keyValuePairs: Record<string, any>
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    chrome.storage.local.set(keyValuePairs, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

//removing keys from local storage
async function removeKeysFromStorage(keys: string[]): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

// handle message functionality for manual keys
async function handleMessageManual({ action, value }, sender?, response?) {
  if (action === "signin") {
    console.log("requesting auth")


    const { data, error } = await supabase.auth.signInWithPassword(value)
    if (data && data.session) {
      await setKeyInStorage({
        [chromeStorageKeys.supabaseAccessToken]: data.session.access_token,
        [chromeStorageKeys.supabaseRefreshToken]: data.session.refresh_token,
        [chromeStorageKeys.supabaseUserData]: data.user,
        [chromeStorageKeys.supabaseExpiration]: data.session.expires_at,
        [chromeStorageKeys.supabaseUserId]: data.user.id
      })
      console.log("User data stored in chrome.storage.sync")
      response({ data, error })
    } else {
      console.log("failed login attempt", error)
      response({ data: null, error: error })
    }
  } else if (action === "signup") {
    const { data, error } = await supabase.auth.signUp(value)
    if (data) {
      await setKeyInStorage({
        [chromeStorageKeys.supabaseAccessToken]: data.session.access_token,
        [chromeStorageKeys.supabaseRefreshToken]: data.session.refresh_token,
        [chromeStorageKeys.supabaseUserData]: data.user,
        [chromeStorageKeys.supabaseExpiration]: data.session.expires_at,
        [chromeStorageKeys.supabaseUserId]: data.user.id
      })
      console.log("User data stored in chrome.storage.sync")
      response({ message: "Successfully signed up!", data: data })
    } else {
      response({ data: null, error: error?.message || "Signup failed" })
    }
  } else if (action === "signout") {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      await removeKeysFromStorage([
        chromeStorageKeys.supabaseAccessToken,
        chromeStorageKeys.supabaseRefreshToken,
        chromeStorageKeys.supabaseUserData,
        chromeStorageKeys.supabaseExpiration,
        chromeStorageKeys.supabaseUserId
      ])
      console.log("User data removed from chrome.storage.sync")
      response({ message: "Successfully signed out!" })
    } else {
      response({ error: error?.message || "Signout failed" })
    }
  } else if (action === "refresh") {
    const refreshToken = (await getKeyFromStorage(
      chromeStorageKeys.supabaseRefreshToken
    )) as string
    if (refreshToken) {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      })

      if (error) {
        response({ data: null, error: error.message })
        return
      }

      console.log("token data", data)

      if (!data || !data.session || !data.user) {
        await handleMessageManual(
          { action: "signout", value: null },
          sender,
          console.log
        )
        response({
          data: null,
          error: "Session expired. Please log in again."
        })
      } else {
        await setKeyInStorage({
          [chromeStorageKeys.supabaseAccessToken]: data.session.access_token,
          [chromeStorageKeys.supabaseRefreshToken]: data.session.refresh_token,
          [chromeStorageKeys.supabaseUserData]: data.user,
          [chromeStorageKeys.supabaseExpiration]: data.session.expires_at,
          [chromeStorageKeys.supabaseUserId]: data.user.id
        })

        console.log("User data refreshed in chrome.storage.sync")
        response({ data: data })
      }
    } else {
      response({ data: null, error: "No refresh token available" })
    }
  }
}

// handle message functionality for automatic keys
/* async function handleMessageAutomatic({ action, value }, sender?, response?) {
    if (action === "signin") {
        const {data, error} = await supabaseAuto.auth.signInWithPassword(value)

        if (data && data.session) {
            response ({data: data, error})
        } else {
            console.log("failed login attempt", error)
            response ({data: null, error: error})
        }
     } else if (action === "signup") {
        const {data, error} = await supabaseAuto.auth.signUp(value)

        if (data) {
            response ({message: "Successfully signed up!", data: data})
        } else {
            response ({data: null, error: error?.message || "Signup failed"})
        }
     } else if (action === "signout") {
        const { error } = await supabaseAuto.auth.signOut()
        if (!error) {
            response({ message: "Successfully signed out!" })
        } else {
            response({ error: error?.message || "Signout failed" })
        }
     } else if (action === "getsession") {
        const { data, error } = await supabaseAuto.auth.getSession()

        if (data && data.session) {
            const sessionExpiration = data.session.expires_at

            response({ data: data })
        }
     } else if (action === "refresh") {
        const { data, error} = await supabaseAuto.auth.refreshSession()

        response({data: data, error: error})
     }
} */

// handler for automatic messages
async function handleMessageAutomatic({ action, value }, sender?, response?) {
    if (action === "signin") {

        const { data, error } = await supabaseAuto.auth.signInWithPassword(value);

        if (data && data.session) {
            response({ data, error });
        } else {
            console.log("failed login attempt", error);
            response({ data: null, error: error });
        }

    } else if (action === "signup") {
        const { data, error } = await supabaseAuto.auth.signUp(value);

        if (data) {
            response({ message: "Successfully signed up!", data: data });
        } else {
            response({ data: null, error: error?.message || "Signup failed" });
        }

    } else if (action === "signout") {
        const { error } = await supabaseAuto.auth.signOut();
        if (!error) {
            response({ message: "Successfully signed out!" });
        } else {
            response({ error: error?.message || "Signout failed" });
        }

    } else if (action === "getsession") {
        console.log("inside get session")
        const { data, error } = await supabaseAuto.auth.getSession();

        console.log("data inside getSession", data)

        if (data && data.session) {
            const sessionExpiration = data.session.expires_at;
            const currentTime = Math.floor(Date.now() / 1000); // Convert to seconds

            if (sessionExpiration <= currentTime) {
                response({ error: "Session has expired" });
            } else {
                console.log("going to send data")
                response({ data: data });
            }

        } else {
            response({ error: "No session available" });
        }

    } else if (action === "refreshsession") {
        const { data, error } = await supabaseAuto.auth.refreshSession();

        response({ data: data, error: error });
    }
}

// the event listener
chrome.runtime.onMessage.addListener((message, sender, response) => {
//   handleMessageManual(message, sender, response)
  handleMessageAutomatic(message, sender, response)
  return true
})
