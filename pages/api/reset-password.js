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

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const toast = useToast();

  console.log('Initial query params on page load:', JSON.stringify(router.query, null, 2));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage('');
    console.log('Starting password reset process');
    console.log('Query params on submit:', JSON.stringify(router.query, null, 2));

    const { token, type, error: urlError } = router.query;

    if (urlError) {
      console.error('URL error present:', urlError);
      setError('Invalid or expired reset link');
      setLoading(false);
      return;
    }

    if (!token || type !== 'recovery') {
      console.error('Invalid reset link: missing token or incorrect type');
      setError('Invalid reset link: missing token or incorrect type. Please request a new reset link.');
      setLoading(false);
      return;
    }

    try {
      console.log('Requesting magic link for email:', email);
      const response = await fetch('/api/verify-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API response error:', result.error);
        throw new Error(result.error || 'Failed to send magic link');
      }

      console.log('Magic link request successful:', JSON.stringify(result, null, 2));

      setMessage('A magic link has been sent to your email. Click it to log in.');
      toast({
        title: 'Success',
        description: 'Magic link sent. Check your email to log in.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      console.log('Scheduling redirect to login');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      console.error('Reset password error:', error.message);
      setError(error.message || 'Failed to process reset request');
      toast({
        title: 'Error',
        description: error.message || 'Failed to process reset request',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      console.log('Reset process complete, resetting loading state');
      setLoading(false);
    }
  };

  return (
    <Box p={8} maxWidth="400px" mx="auto">
      <VStack spacing={6}>
        <Heading>Reset Password</Heading>
        <Text>Please enter your email to receive a magic link to log in.</Text>

        <Box as="form" onSubmit={handleSubmit} width="100%">
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
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
              loadingText="Processing..."
            >
              Send Magic Link
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


