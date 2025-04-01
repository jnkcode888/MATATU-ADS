// pages/freelancer/dashboard.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function FreelancerDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/freelancer/profile');
  }, [router]);

  return null;
}