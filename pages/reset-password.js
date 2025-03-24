import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  Stack,
  useToast,
} from '@chakra-ui/react';
import { supabase } from '../lib/auth';
import { useRouter } from 'next/router';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    // Check if there's a session with a reset token
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error checking session:', error);
        setErrorMessage('Invalid or expired reset link. Please try again.');
        return;
      }

      if (!session || !session.access_token) {
        setErrorMessage('Invalid or expired reset link. Please try again.');
      }
    };

    checkSession();
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!newPassword) {
      toast({
        title: 'Error',
        description: 'Please enter a new password',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully updated. Please log in with your new password.',
        status: 'success',
        duration: 7000,
        isClosable: true,
      });

      setNewPassword('');
      router.push('/');
    } catch (error) {
      console.error('Password update failed:', error.message);
      toast({
        title: 'Password Update Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (errorMessage) {
    return (
      <Box p={8} maxWidth="400px" mx="auto">
        <Heading textAlign="center">Reset Password</Heading>
        <Text mt={4} textAlign="center" color="red.500">
          {errorMessage}
        </Text>
        <Button
          mt={4}
          colorScheme="blue"
          width="full"
          onClick={() => router.push('/')}
        >
          Go to Login
        </Button>
      </Box>
    );
  }

  return (
    <Box p={8} maxWidth="400px" mx="auto">
      <Heading textAlign="center">Reset Password</Heading>
      <Text mt={4} textAlign="center">
        Enter your new password below.
      </Text>
      <Box as="form" mt={8} onSubmit={handleResetPassword}>
        <Stack spacing={4}>
          <FormControl id="new-password" isRequired>
            <FormLabel>New Password</FormLabel>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
            />
          </FormControl>
          <Button
            type="submit"
            colorScheme="blue"
            width="full"
            mt={4}
            isLoading={isLoading}
          >
            Update Password
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}