// react stuff
import { zodResolver } from "@hookform/resolvers/zod"
// supabase stuff
import type { Provider, User } from "@supabase/supabase-js"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
// react-hook-form stuff
import { z } from "zod"

// plasmo stuff
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

import { Button } from "~components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "~components/ui/form"
import { Input } from "~components/ui/input"
//Shadcn stuff
import { Toaster } from "~components/ui/toaster"
import { useToast } from "~components/ui/use-toast"

// tailwind stuff
import "~style.css"

// the supabase variable inputs
import { supabaseAuto, supabaseManual, supabasePlasmo } from "./core/supabase"

/* export default function IndexPopup() {
  const [data, setData] = useState("")

  return (
    <div className="max-w-6xl">
      <div className="w-96 px-5 py-4">
        <h1>Welcome to the Shadcn Components</h1>
        <Button>This is the shadcn button</Button>
      </div>
    </div>
  )
}
 */

// init chrome storage keys
const chromeStorageKeys = {
  supabaseAccessToken: "supabaseAccessToken",
  supabaseRefreshToken: "supabaseRefreshToken",
  supabaseUserData: "supabaseUserData",
  supabaseExpiration: "supabaseExpiration",
  supabaseUserId: "supabaseUserId"
}

// creating a form schema
const formSchema = z.object({
  username: z.string().min(2).max(50),
  password: z.string().min(8)
})

// non-plasmo LoginAuthForm automatic
export default function LoginAuthFormAutomatic() {
  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [expiration, setExpiration] = useState(0)

  // for the toast component
  const { toast } = useToast()

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  })

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log("values before submitting", values)

    // this function here is key, as the handlelogin points back to messaging service
    handleLogin(values.username, values.password)
  }

  // create a function to handle login
  async function handleLogin(username: string, password: string) {
    try {
      // Send a message to the background script to initiate the login
      chrome.runtime.sendMessage(
        { action: "signin", value: { email: username, password: password } },
        (response) => {
          if (response.error) {
            // alert("Error with auth: " + response.error.message);

            toast({
              description: `Error with auth: ${response.error.message}`
            })

            console.log("Error with auth: " + response.error.message)
          } else if (response.data?.user) {
            setUser(response.data.user)
            setExpiration(response.data.session.expires_at)
          }
        }
      )
    } catch (error) {
      console.log("Error with auth: " + error.error.message)
      // alert(error.error_description || error);
    }
  }

  // handleSignup method
  async function handleSignup(username: string, password: string) {
    try {
      chrome.runtime.sendMessage(
        { action: "signup", value: { email: username, password: password } },
        (response) => {
          if (response.error) {
            toast({
              description: `Error with signup: ${response.error.message}`
            })
            console.log("Error with signup: " + response.error.message)
          } else if (response.data?.user) {
            setUser(response.data.user)
            setExpiration(response.data.session.expires_at)
          }
        }
      )
    } catch (error) {
      console.log("Error with signup: " + error.error.message)
      toast({
        description: error.error_description || error.message
      })
    }
  }

  async function handleSignOut() {
    try {
      // Send a message to the background script to initiate the sign out
      chrome.runtime.sendMessage({ action: "signout" }, (response) => {
        if (response.error) {
          toast({ description: `Error signing out: ${response.error}` })
          console.log("Error signing out: ", response.error)
        } else {
          // Clear the user and session data upon successful sign-out
          setUser(null)
          setExpiration(0)
        }
      })
    } catch (error) {
      console.log("Error signing out: ", error.message)
    }
  }

  const refreshSession = () => {
    chrome.runtime.sendMessage(
      { action: "refreshsession" },
      (refreshResponse) => {
        if (refreshResponse.error) {
          console.log("Error refreshing session: " + refreshResponse.error)
        } else if (refreshResponse.data && refreshResponse.data.session) {
          console.log("Session refreshed successfully")
          setUser(refreshResponse.data.user)
        } else {
          console.log("Error: refreshed session data is not available")
        }
      }
    )
  }

  useEffect(() => {
    chrome.runtime.sendMessage({ action: "getsession" }, (response) => {
      // console.log('sending getsession from popup')
      console.log("response", response)

      if (response.error) {
        // If session has expired, attempt to refresh it
        if (response.error === "Session has expired") {
          console.log("Session has expired, attempting to refresh...")
          refreshSession()
        } else {
          console.log("Error getting session: " + response.error)
        }
      } else if (response.data && response.data.session) {
        console.log("Session retrieved successfully")
        console.log("Session data: ", response.data.session)
        console.log("User data: ", response.data.session.user)
        setUser(response.data.session.user)
      } else {
        console.log("Error: session data is not available")
      }
    })
  }, [])

  return (
    <div className="w-96 px-5 py-4">
      <Toaster></Toaster>
      {user ? (
        // If user is logged in
        <div>
          <h1 className="text-xl font-bold mb-4">User Info</h1>
          <p>User ID: {user.id}</p> <Button onClick={handleSignOut}></Button>
        </div>
      ) : (
        <Form {...form}>
          <h1 className="text-xl font-bold mb-4">Basic Auth</h1>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Login</Button>
            <Button 
            onClick={() => {
              const { username, password } = form.getValues();
              handleSignup(username, password);
            }}
          ></Button>
          </form>
        </Form>
      )}
    </div>
  )
}

//non-plasmo LoginAuthForm manual
export function LoginAuthFormManual() {
  const [user, setUser] = useState(null)
  const [expiration, setExpiration] = useState(0)
  const [loadingUser, setLoadingUser] = useState(true)

  // for the toast component
  const { toast } = useToast()

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  })

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values)

    // this function here is key, as the handlelogin points back to messaging service
    handleLogin(values.username, values.password)
  }

  async function handleSignup(username: string, password: string) {
    try {
      chrome.runtime.sendMessage(
        { action: "signup", value: { email: username, password: password } },
        (response) => {
          if (response.error) {
            toast({
              description: `Error with signup: ${response.error.message}`
            })
            console.log("Error with signup: " + response.error.message)
          } else if (response.data?.user) {
            setUser(response.data.user)
            // Assuming you also have a function or state for 'setExpiration'
            setExpiration(response.data.session.expires_at)
          }
        }
      )
    } catch (error) {
      console.log("Error with signup: " + error.error.message)
      toast({
        description: error.error_description || error.message
      })
    }
  }

  // create a function to handle login
  async function handleLogin(username: string, password: string) {
    try {
      // Send a message to the background script to initiate the login
      chrome.runtime.sendMessage(
        { action: "signin", value: { email: username, password: password } },
        (response) => {
          if (response.error) {
            // alert("Error with auth: " + response.error.message);

            toast({
              description: `Error with auth: ${response.error.message}`
            })

            console.log("Error with auth: " + response.error.message)
          } else if (response.data?.user) {
            setUser(response.data.user)
            setExpiration(response.data.session.expires_at)
          }
        }
      )
    } catch (error) {
      console.log("Error with auth: " + error.error.message)
      // alert(error.error_description || error);
    }
  }

  // this is the signout functionality
  async function handleSignout() {
    try {
      // Send a message to the background script to initiate the signout
      chrome.runtime.sendMessage(
        { action: "signout", value: null },
        (response) => {
          if (response.error) {
            toast({
              title: "Error",
              description: "Error signing out: " + response.error.message
            })

            alert("Error signing out: " + response.error.message)
          } else {
            setUser(null)
            setExpiration(0)
          }
        }
      )
    } catch (error) {
      console.log("error", error)
      alert(error.error_description || error)
    }
  }

  useEffect(() => {
    setLoadingUser(true)

    chrome.storage.local.get(
      [
        chromeStorageKeys.supabaseAccessToken,
        chromeStorageKeys.supabaseExpiration,
        chromeStorageKeys.supabaseUserData
      ],
      (result) => {
        if (result && result[chromeStorageKeys.supabaseAccessToken]) {
          const currentTime = Math.floor(Date.now() / 1000) // convert to seconds
          const timeUntilExpiration =
            result[chromeStorageKeys.supabaseExpiration] - currentTime

          const refreshAndUpdate = () => {
            chrome.runtime.sendMessage({ action: "refresh" }, (response) => {
              if (response.error) {
                console.log("Error refreshing token: " + response.error)
              } else {
                if (response.data && response.data.session) {
                  console.log("Token refreshed successfully")
                  setUser(response.data.user)
                  setExpiration(response.data.session.expires_at)
                } else {
                  console.log("Error: session data is not available")
                }
              }
              setLoadingUser(false)
            })
          }

          if (timeUntilExpiration <= 0) {
            // Token is expired, request a refresh and update user and expiration
            console.log("Session expired, refreshing token")
            refreshAndUpdate()
          } else {
            // Token is not expired, set user data and expiration
            setUser(result[chromeStorageKeys.supabaseUserData])
            setExpiration(result[chromeStorageKeys.supabaseExpiration])

            if (timeUntilExpiration < 24 * 60 * 60) {
              // less than 24 hours left, request a refresh and update user and expiration
              console.log("Token is about to expire, refreshing token")
              refreshAndUpdate()
            } else {
              setLoadingUser(false) //Add this line
            }
          }
        } else {
          setLoadingUser(false) //Add this line
        }
      }
    )
  }, [])

  return (
    <div className="w-96 px-5 py-4">
      <Toaster></Toaster>
      {!loadingUser && !user ? (
        <Form {...form}>
          <h1 className="text-xl font-bold mb-4">Basic Auth</h1>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Login</Button>
            <Button 
            onClick={() => {
              const { username, password } = form.getValues();
              handleSignup(username, password);
            }}
          ></Button>
          </form>
        </Form>
      ) : loadingUser ? (
        <div>Loading...</div>
      ) : (
        <div className="mt-4">
          <p className="mb-4">Logged in as: {user.id}</p>
          <Button onClick={handleSignout}>Signout</Button>
        </div>
      )}
    </div>
  )
}

// plasmo method
export default function LoginAuthFormPlasmo() {
  const [user, setUser] = useStorage<User>({
    key: "user",
    instance: new Storage({
      area: "local"
    })
  })

  const { toast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  })

  useEffect(() => {
    async function init() {
      const { data, error } = await supabasePlasmo.auth.getSession()

      if (error) {
        console.error(error)
        return
      }
      if (!!data.session) {
        setUser(data.session.user)
      }
    }

    init()
  }, [])

  const handleEmailLogin = async (type: "LOGIN" | "SIGNUP") => {
    const { username, password } = form.getValues()

    try {
      const { error, data } =
        type === "LOGIN"
          ? await supabasePlasmo.auth.signInWithPassword({
              email: username,
              password
            })
          : await supabasePlasmo.auth.signUp({
              email: username,
              password
            })

      if (error) {
        toast({
          description: `Error with auth: ${error.message}`
        })
      } else if (!data.user) {
        toast({
          description:
            "Signup successful, confirmation mail should be sent soon!"
        })
      } else {
        setUser(data.user)
      }
    } catch (error) {
      console.log("error", error)
      toast({
        description: error.error_description || error
      })
    }
  }

  return (
    <div className="w-96 px-5 py-4">
      <Toaster />
      {user ? (
        <>
          <h3>
            {user.email} - {user.id}
          </h3>
          <h1>this is plasmo </h1>
          <button
            onClick={() => {
              supabasePlasmo.auth.signOut()
              setUser(null)
            }}>
            Logout
          </button>
        </>
      ) : (
        <Form {...form}>
          <h1 className="text-xl font-bold mb-4">Login</h1>
          <form
            onSubmit={form.handleSubmit((data) => handleEmailLogin("LOGIN"))}
            className="space-y-8">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Your Password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Login</Button>
            <Button onClick={() => handleEmailLogin("SIGNUP")}>Sign up</Button>
          </form>
        </Form>
      )}
    </div>
  )
}
