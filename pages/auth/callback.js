import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import {
  Box,
  Heading,
  Text,
  Spinner,
  VStack,
  useToast,
} from '@chakra-ui/react';

export default function AuthCallback() {
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        if (!session?.user) {
          throw new Error('No session found');
        }

        // Check if user profile exists
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile error:', profileError);
          throw profileError;
        }

        if (!profile) {
          // User needs to complete registration
          toast({
            title: 'Welcome!',
            description: 'Please complete your registration.',
            status: 'info',
            duration: 3000,
            isClosable: true,
          });
          router.push('/complete-registration');
        } else {
          // User is already registered, redirect to dashboard
          toast({
            title: 'Welcome back!',
            description: 'Redirecting to your dashboard...',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Authentication failed',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        router.push('/register');
      }
    };

    handleCallback();
  }, [router, toast]);

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
      <VStack spacing={6}>
        <Spinner size="xl" color="blue.500" />
        <Heading size="lg">Processing authentication...</Heading>
        <Text color="gray.600">Please wait while we complete your sign-in.</Text>
      </VStack>
    </Box>
  );
} 