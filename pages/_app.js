import { useEffect, useState, useRef } from 'react';
import { ChakraProvider, useToast } from '@chakra-ui/react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

// Debounce utility function
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export default function MyApp({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();
  const isRedirecting = useRef(false);

  const publicRoutes = ['/', '/register', '/login', '/reset-password'];
  const isPublicRoute = publicRoutes.includes(router.pathname);

  const redirectUser = (userType) => {
    if (isRedirecting.current) {
      console.log('Redirect already in progress, skipping...');
      return;
    }

    const currentPath = router.pathname;
    let targetPath = '/';

    switch (userType) {
      case 'admin':
        targetPath = '/admin';
        break;
      case 'business':
        targetPath = '/business/dashboard';
        // Allow navigation within /business/* for business users
        if (currentPath.startsWith('/business')) {
          console.log(`User is on a business route (${currentPath}), no redirect needed`);
          return;
        }
        break;
      case 'freelancer':
        targetPath = '/freelancer/profile';
        // Allow navigation within /freelancer/* for freelancers
        if (currentPath.startsWith('/freelancer')) {
          console.log(`User is on a freelancer route (${currentPath}), no redirect needed`);
          return;
        }
        break;
      default:
        targetPath = '/complete-registration';
    }

    if (currentPath !== targetPath) {
      console.log(`Redirecting user with user_type '${userType}' to ${targetPath}`);
      isRedirecting.current = true;
      router.replace(targetPath).then(() => {
        isRedirecting.current = false;
        console.log('Redirect completed');
      }).catch((err) => {
        console.error('Redirect error:', err);
        isRedirecting.current = false;
      });
    } else {
      console.log(`Already on target path ${targetPath}, no redirect needed`);
    }
  };

  const checkSession = debounce(async () => {
    try {
      console.log('Checking session in _app.js...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session retrieval error:', sessionError);
        throw new Error('Failed to retrieve session: ' + sessionError.message);
      }

      if (!session) {
        console.log('No session found, clearing user data');
        setUser(null);
        setUserData(null);
        setLoading(false);
        if (!isPublicRoute && !isRedirecting.current) {
          console.log('Not on a public route, redirecting to /');
          isRedirecting.current = true;
          router.replace('/').then(() => {
            isRedirecting.current = false;
          });
        }
        return;
      }

      console.log('Session found for user:', session.user.id);
      setUser(session.user);

      let userProfile = null;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        if (error.code === 'PGRST116') {
          console.log('User profile not found, creating a new profile for user:', session.user.id);
          const { data: existingUser, error: emailCheckError } = await supabase
            .from('users')
            .select('id')
            .eq('email', session.user.email)
            .single();

          if (emailCheckError && emailCheckError.code !== 'PGRST116') {
            throw emailCheckError;
          }

          if (existingUser) {
            const { data: updatedProfile, error: updateError } = await supabase
              .from('users')
              .update({
                id: session.user.id,
                user_type: 'freelancer',
                created_at: new Date().toISOString(),
              })
              .eq('email', session.user.email)
              .select('*')
              .single();

            if (updateError) {
              console.error('Error updating profile:', updateError);
              throw updateError;
            }
            userProfile = updatedProfile;
          } else {
            const { data: newProfile, error: insertError } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email,
                user_type: 'freelancer',
                created_at: new Date().toISOString(),
              })
              .select('*')
              .single();

            if (insertError) {
              console.error('Error creating profile:', insertError);
              throw insertError;
            }
            userProfile = newProfile;
          }
        } else {
          throw error;
        }
      } else {
        userProfile = data;
      }

      console.log('User data fetched:', userProfile);
      setUserData(userProfile);
      setLoading(false);

      if (userProfile.user_type) {
        redirectUser(userProfile.user_type);
      } else if (!isPublicRoute && !isRedirecting.current) {
        console.log('User type not set, redirecting to /complete-registration');
        isRedirecting.current = true;
        router.replace('/complete-registration').then(() => {
          isRedirecting.current = false;
        });
      }
    } catch (error) {
      console.error('Session check error in _app.js:', error);
      setLoading(false);
      if (error.message !== 'No session available. Please sign in manually.') {
        toast({
          title: 'Error',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  }, 500);

  useEffect(() => {
    console.log('Running useEffect in _app.js for pathname:', router.pathname);
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed in _app.js:', event, session ? 'Session exists' : 'No session');
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        await checkSession();
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing user data');
        setUser(null);
        setUserData(null);
        setLoading(false);
        if (!isPublicRoute && !isRedirecting.current) {
          console.log('Not on a public route, redirecting to /');
          isRedirecting.current = true;
          router.replace('/').then(() => {
            isRedirecting.current = false;
          });
        }
      }
    });

    const handleRouteChange = () => {
      console.log('Route change complete, resetting isRedirecting');
      isRedirecting.current = false;
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      console.log('Cleaning up _app.js useEffect');
      subscription?.unsubscribe();
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.pathname]);

  if (loading && !isPublicRoute) {
    return (
      <ChakraProvider>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          backgroundColor: 'white'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            Loading your dashboard...
          </div>
        </div>
      </ChakraProvider>
    );
  }

  return (
    <ChakraProvider>
      <Component {...pageProps} user={user} userData={userData} />
    </ChakraProvider>
  );
}