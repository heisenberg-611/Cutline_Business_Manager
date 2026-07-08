import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect the root page to the dashboard. 
  // If the user isn't logged in, our Clerk middleware will intercept this 
  // and redirect them to the sign-in page.
  redirect('/dashboard')
}
