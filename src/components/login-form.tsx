'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth/context"
import { getKeygenApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { handleFormError } from "@/lib/utils/error-handling"

const signInSchema = z.object({
  email: z.string().trim().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
})

type SignInFormValues = z.infer<typeof signInSchema>

const resetSchema = z.object({
  email: z.string().trim().min(1, 'Email is required'),
})

type ResetFormValues = z.infer<typeof resetSchema>

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { login, loading, error } = useAuth()
  const router = useRouter()

  const [mode, setMode] = useState<"sign-in" | "forgot-password">("sign-in")
  const [resetSent, setResetSent] = useState(false)

  const signInForm = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  const resetForm = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '' },
  })

  const handleSubmit = async (values: SignInFormValues) => {
    try {
      await login(values.email, values.password)
      router.push("/dashboard")
    } catch {
      // Error is handled by auth context
    }
  }

  const handleForgotPassword = async (values: ResetFormValues) => {
    try {
      const api = getKeygenApi()
      await api.passwords.resetRequest(values.email)
      setResetSent(true)
    } catch (error: unknown) {
      handleFormError(error, "password reset")
    }
  }

  const backToSignIn = () => {
    setMode("sign-in")
    resetForm.reset({ email: '' })
    setResetSent(false)
  }

  const sendingReset = resetForm.formState.isSubmitting

  if (mode === "forgot-password") {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>
              Enter your email and we&apos;ll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resetSent ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-md bg-muted p-3 text-sm">
                  If an account exists for {resetForm.getValues('email')}, a reset link is on its way.
                </div>
                <Button type="button" variant="outline" className="w-full" onClick={backToSignIn}>
                  Back to sign in
                </Button>
              </div>
            ) : (
              <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(handleForgotPassword)}>
                  <div className="flex flex-col gap-6">
                    <FormField
                      control={resetForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="admin@example.com"
                              disabled={sendingReset}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={sendingReset}>
                      {sendingReset ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send reset link"
                      )}
                    </Button>

                    <Button type="button" variant="ghost" className="w-full" onClick={backToSignIn}>
                      Back to sign in
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to Keygen</CardTitle>
          <CardDescription>
            Enter your credentials to access the license management dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...signInForm}>
            <form onSubmit={signInForm.handleSubmit(handleSubmit)}>
              <div className="flex flex-col gap-6">
                {error && (
                  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <FormField
                  control={signInForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@example.com"
                          disabled={loading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signInForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <button
                          type="button"
                          onClick={() => setMode("forgot-password")}
                          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <FormControl>
                        <Input type="password" disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
