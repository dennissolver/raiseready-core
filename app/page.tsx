import { redirect } from 'next/navigation';

export default function Home() {
  // Admin platform - redirect to setup wizard
  if (process.env.IS_ADMIN_PLATFORM === 'true') {
    redirect('/setup');
  }
  
  // Client platforms keep the landing page
  redirect('/login');
}