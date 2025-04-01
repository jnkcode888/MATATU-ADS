import { useState } from 'react';
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
import { supabase } from '../../lib/supabase';

export default function EditProfile() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage('');

    if (password !== confirmPassword) {
      console.log('Passwords do not match');
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      console.log('Checking current session');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        console.error('No session found:', sessionError);
        throw new Error('You must be logged in to update your password');
      }
      console.log('Session found:', JSON.stringify(sessionData.session, null, 2));

      console.log('Updating password');
      const { data, error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        console.error('Update user error:', updateError);
        throw new Error(updateError.message || 'Failed to update password');
      }
      console.log('Password updated successfully:', JSON.stringify(data, null, 2));

      setMessage('Password updated successfully');
      toast({
        title: 'Success',
        description: 'Your password has been updated. You can now log in with your new password.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      console.error('Update password error:', error.message);
      setError(error.message || 'Failed to update password');
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      console.log('Update process complete');
      setLoading(false);
    }
  };

  return (
    <Box p={8} maxWidth="400px" mx="auto">
      <VStack spacing={6}>
        <Heading>Edit Profile</Heading>
        <Text>Set a password below whenever you’re ready.</Text>

        <Box as="form" onSubmit={handleSubmit} width="100%">
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>New Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={loading}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Confirm Password</FormLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={loading}
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
              loadingText="Updating..."
            >
              Update Password
            </Button>

            {error && (
              <Button
                variant="link"
                colorScheme="blue"
                onClick={() => router.push('/login')}
                mt={2}
              >
                Back to Login
              </Button>
            )}
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}