import { useEffect, useState } from 'react';
import { Box, Heading, Text, Button, VStack, Spinner, useToast, Code, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function VerifyEmail() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Helper to add debug messages
  const addDebug = (message) => {
    console.log(message);
    setDebugInfo(prev => [...prev, `${new Date().toISOString().slice(11, 19)}: ${message}`]);
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const verifyAndRedirect = async () => {
      if (!isMounted) return;

      try {
        addDebug('Starting verification process');
        
        // Check for hash parameters
        const hashParams = window.location.hash.substring(1);
        if (!hashParams) {
          addDebug('No hash parameters found, checking for existing session');
          
          // Check if user is already logged in
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            addDebug(`Error getting session: ${sessionError.message}`);
            throw new Error(`Failed to check authentication status: ${sessionError.message}`);
          }
          
          if (session?.user) {
            addDebug(`Found existing session for user: ${session.user.id}`);
            await redirectBasedOnUserType(session.user);
            return;
          } else {
            addDebug('No session found and no verification tokens in URL');
            throw new Error('No verification data found. Please try the verification link again or sign in manually.');
          }
        }

        // Extract tokens from hash
        addDebug('Extracting tokens from URL hash');
        const urlParams = new URLSearchParams(hashParams);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const type = urlParams.get('type');
        
        addDebug(`Token type: ${type || 'unknown'}`);
        
        if (!accessToken || !refreshToken) {
          addDebug('Missing required tokens');
          throw new Error('Invalid verification link. Required authentication data is missing.');
        }
        
        // Try to set session with extracted tokens
        addDebug('Setting session with tokens');
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (setSessionError) {
          addDebug(`Error setting session: ${setSessionError.message}`);
          throw new Error(`Authentication failed: ${setSessionError.message}`);
        }
        
        // Verify the session was set correctly
        addDebug('Verifying session was set correctly');
        const { data: { session }, error: getSessionError } = await supabase.auth.getSession();
        
        if (getSessionError) {
          addDebug(`Error getting session: ${getSessionError.message}`);
          throw new Error(`Failed to verify authentication: ${getSessionError.message}`);
        }
        
        if (!session) {
          addDebug('No session after setting tokens');
          throw new Error('Failed to establish session after verification. Please try signing in manually.');
        }
        
        addDebug(`Session established for user: ${session.user.id}`);
        addDebug(`User email: ${session.user.email}`);
        addDebug(`User metadata: ${JSON.stringify(session.user.user_metadata)}`);
        
        // Redirect based on user type
        await redirectBasedOnUserType(session.user);
      } catch (err) {
        addDebug(`Error during verification: ${err.message}`);
        if (isMounted) {
          setError(err.message || 'An error occurred during the verification process.');
          setLoading(false);
        }
      }
    };

    const redirectBasedOnUserType = async (user) => {
      try {
        // Try to get user_type from user metadata first
        const userMetadata = user.user_metadata || {};
        const userType = userMetadata.user_type;
        
        if (userType) {
          addDebug(`Found user_type in metadata: ${userType}`);
          await performRedirect(userType);
          return;
        }
        
        addDebug('No user_type in metadata, querying database');
        
        // Set a timeout for the database query
        const dbPromise = supabase
          .from('users')
          .select('user_type')
          .eq('id', user.id)
          .single();
          
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database query timed out')), 5000);
        });
        
        addDebug('Executing database query with timeout');
        const { data: profile, error: profileError } = await Promise.race([
          dbPromise,
          timeoutPromise
        ]);
        
        if (profileError) {
          addDebug(`Database query error: ${profileError.message}`);
          
          // If we get a timeout or database error, try one more approach: check auth metadata
          addDebug('Attempting to get user type from auth metadata as fallback');
          
          const { data, error: metadataError } = await supabase.auth.admin?.getUserById(user.id);
          
          if (!metadataError && data?.user?.user_metadata?.user_type) {
            const fallbackUserType = data.user.user_metadata.user_type;
            addDebug(`Found user_type in auth metadata: ${fallbackUserType}`);
            await performRedirect(fallbackUserType);
            return;
          }
          
          throw new Error(`Failed to retrieve your account information: ${profileError.message}`);
        }
        
        if (!profile) {
          addDebug('User profile not found in database');
          throw new Error('Your user profile was not found. Please contact support.');
        }
        
        if (!profile.user_type) {
          addDebug('User profile exists but has no user_type');
          throw new Error('Your account type is not set. Please contact support.');
        }
        
        addDebug(`User type from database: ${profile.user_type}`);
        await performRedirect(profile.user_type);
      } catch (err) {
        addDebug(`Error during redirect: ${err.message}`);
        if (isMounted) {
          setError(err.message || 'Failed to complete the verification process.');
          setLoading(false);
        }
      }
    };
    
    const performRedirect = async (userType) => {
      if (!isMounted || isRedirecting) return;
      
      setIsRedirecting(true);
      addDebug(`Starting redirect for user type: ${userType}`);
      
      // Determine redirect path based on user type
      let redirectPath;
      switch (userType.toLowerCase()) {
        case 'business':
          redirectPath = '/business/dashboard';
          break;
        case 'freelancer':
          redirectPath = '/freelancer/profile';
          break;
        case 'admin':
          redirectPath = '/admin';
          break;
        default:
          redirectPath = '/dashboard';
      }
      
      addDebug(`Redirect path determined: ${redirectPath}`);
      
      // Show success toast
      toast({
        title: 'Email Verified',
        description: `Welcome! Taking you to your ${userType} dashboard...`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Try to redirect
      addDebug(`Executing router.push to: ${redirectPath}`);
      try {
        await router.push(redirectPath);
        addDebug('Router.push completed successfully');
        if (isMounted) setLoading(false);
      } catch (err) {
        addDebug(`Router.push failed: ${err.message}`);
        addDebug('Falling back to direct location change');
        window.location.href = redirectPath;
      }
    };

    // Set a master timeout for the entire process
    timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        addDebug('Master timeout reached - verification process took too long');
        setError('The verification process timed out. Debug information is available below.');
        setLoading(false);
      }
    }, 15000);

    // Start verification
    verifyAndRedirect();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [router, toast, isRedirecting]);

  if (loading) {
    return (
      <Box p={8} maxWidth="500px" mx="auto" textAlign="center">
        <VStack spacing={6}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Heading size="md">Verifying Your Email</Heading>
          <Text>Please wait while we complete the verification process...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={8} maxWidth="500px" mx="auto" textAlign="center">
        <VStack spacing={6}>
          <Heading size="lg">Verification Issue</Heading>
          <Text color="red.500">{error}</Text>
          <Text>If you continue to experience issues, please contact our support team.</Text>
          
          <Accordion allowToggle width="100%" mt={4}>
            <AccordionItem>
              <h2>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    Debug Information
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4}>
                <Box
                  bg="gray.100"
                  p={3}
                  borderRadius="md"
                  maxHeight="200px"
                  overflowY="auto"
                  fontSize="sm"
                  fontFamily="monospace"
                >
                  {debugInfo.map((msg, idx) => (
                    <Text key={idx}>{msg}</Text>
                  ))}
                </Box>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
          
          <Button colorScheme="blue" onClick={() => router.push('/')}>
            Return to Login
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={8} maxWidth="500px" mx="auto" textAlign="center">
      <VStack spacing={6}>
        <Heading size="lg">Email Verified</Heading>
        <Text>Your account has been verified successfully!</Text>
        <Text>You will be redirected momentarily. If not, click the button below.</Text>
        <Button colorScheme="blue" onClick={() => router.push('/')}>
          Go to Login
        </Button>
      </VStack>
    </Box>
  );
}