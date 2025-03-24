// pages/_app.js
import { useEffect, useState, useRef } from 'react';
import { ChakraProvider, useToast } from '@chakra-ui/react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function MyApp({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();
  const isRedirecting = useRef(false);

  const publicRoutes = ['/', '/register', '/login'];
  const isPublicRoute = publicRoutes.includes(router.pathname);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      if (!isMounted) return;

      if (isPublicRoute) {
        setLoading(false);
      }

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!session) {
          if (isMounted) {
            setUser(null);
            setUserData(null);
            setLoading(false);
          }

          if (!isPublicRoute && isMounted && !isRedirecting.current) {
            isRedirecting.current = true;
            router.push('/');
          }
          return;
        }

        const currentUser = session.user;
        if (isMounted) setUser(currentUser);

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', currentUser.email)
          .single();

        if (error) {
          if (isMounted) {
            setUserData(null);
            setLoading(false);
            toast({
              title: "Error fetching user data",
              description: error.message,
              status: "error",
              duration: 5000,
              isClosable: true,
            });
          }

          if (!isPublicRoute && isMounted && !isRedirecting.current) {
            isRedirecting.current = true;
            router.push('/');
          }
          return;
        }

        if (!data) {
          if (isMounted) {
            setUserData(null);
            setLoading(false);
            toast({
              title: "User data missing",
              description: "Profile data missing. Contact support.",
              status: "warning",
              duration: 5000,
              isClosable: true,
            });
          }

          if (!isPublicRoute && isMounted && !isRedirecting.current) {
            isRedirecting.current = true;
            router.push('/');
          }
          return;
        }

        const userType = data.user_type || data.userType;

        if (isMounted) {
          setUserData(data);
          setLoading(false);
        }

        const currentPath = router.pathname;
        const businessPath = '/business/dashboard';
        const freelancerPath = '/freelancer/profile';
        const adminPath = '/admin';

        if (isMounted && !isRedirecting.current) {
          let shouldRedirect = false;
          let redirectPath = '/';

          if (isPublicRoute && session) {
            shouldRedirect = true;
            redirectPath = userType === 'business' ? businessPath :
                           userType === 'freelancer' ? freelancerPath :
                           userType === 'admin' ? adminPath : '/';
          } else if (
            session &&
            ((userType === 'business' && !currentPath.startsWith('/business')) ||
             (userType === 'freelancer' && !currentPath.startsWith('/freelancer')) ||
             (userType === 'admin' && !currentPath.startsWith('/admin')))
          ) {
            shouldRedirect = true;
            redirectPath = userType === 'business' ? businessPath :
                           userType === 'freelancer' ? freelancerPath :
                           userType === 'admin' ? adminPath : '/';
          }

          if (shouldRedirect && currentPath !== redirectPath) {
            isRedirecting.current = true;
            toast({
              title: "Redirecting",
              description: "Taking you to your dashboard",
              status: "info",
              duration: 2000,
              isClosable: true,
            });
            router.replace(redirectPath);
          }
        }
      } catch (err) {
        console.error('Error in session check:', err);
        if (isMounted) {
          setLoading(false);
          toast({
            title: "Authentication Error",
            description: err.message,
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        }
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        checkSession();
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setUser(null);
          setUserData(null);
          setLoading(false);
          isRedirecting.current = true;
          toast({
            title: "Signed Out",
            description: "You have been signed out",
            status: "info",
            duration: 3000,
            isClosable: true,
          });
          router.push('/');
        }
      } else if (event === 'INITIAL_SESSION' && loading) {
        checkSession();
      }
    });

    const handleRouteChange = () => {
      isRedirecting.current = false;
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.pathname, isPublicRoute]);

  if (loading && !isPublicRoute) {
    return (
      <ChakraProvider>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          Loading...
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