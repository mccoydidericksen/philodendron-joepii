import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-moss-dark">Get started</h1>
          <p className="mt-2 text-soil">Create an account to start tracking your plants 🌱</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-lg border-2 border-sage',
            },
          }}
        />
      </div>
    </div>
  );
}
