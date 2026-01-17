import { SignUpForm } from '@/components/auth/SignUpForm'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Sign up to get started
        </p>
      </div>

      <SignUpForm />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">
            Or continue with
          </span>
        </div>
      </div>

      <GoogleSignInButton />
    </div>
  )
}
