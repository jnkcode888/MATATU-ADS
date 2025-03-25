import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  useToast,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const handleResetToken = async () => {
      const { access_token, refresh_token } = router.query;

      if (access_token && refresh_token) {
        // Set the session from URL tokens
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) {
          console.error('Error setting session from token:', error);
          setError('Invalid or expired reset link');
          router.push('/login');
        }
      } else {
        // Check existing session if no tokens in URL
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          console.error('No valid session or tokens:', error);
          router.push('/login');
        }
      }
    };

    if (router.isReady) {
      handleResetToken();
    }
  }, [router, router.isReady]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No active session. Please request a new reset link.');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;

      // Fetch user profile to determine role
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile fetch error:', profileError);
      }

      setMessage('Password updated successfully');
      toast({
        title: 'Success',
        description: 'Your password has been updated successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Redirect based on user_type
      setTimeout(() => {
        if (profile?.user_type === 'admin') {
          router.push('/admin');
        } else if (profile?.user_type === 'freelancer') {
          router.push('/freelancer/dashboard');
        } else if (profile?.user_type === 'business') {
          router.push('/business/dashboard');
        } else {
          router.push('/dashboard'); // Fallback
        }
      }, 2000);
    } catch (error) {
      console.error('Reset password error:', error);
      setError(error.message || 'Failed to reset password');
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={8} maxWidth="400px" mx="auto">
      <VStack spacing={6}>
        <Heading>Reset Password</Heading>
        <Text>Please enter your new password below.</Text>

        <Box as="form" onSubmit={handleSubmit} width="100%">
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>New Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Confirm Password</FormLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </FormControl>

            {error && (
              <Alert status="error">
                <AlertIcon />
                {error}
              </Alert>
            )}

            {message && (
              <Alert status="success">
                <AlertIcon />
                {message}
              </Alert>
            )}

            <Button
              type="submit"
              colorScheme="blue"
              width="100%"
              isLoading={loading}
            >
              Reset Password
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}