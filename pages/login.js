import { useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Button, FormControl, FormLabel, Input, VStack, useToast, Heading } from '@chakra-ui/react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Attempting login with:', { email });

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Login error:', signInError);
        throw new Error(signInError.message);
      }

      console.log('Login successful, session should be set');

      toast({
        title: 'Login Successful',
        description: 'You are now logged in.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // The redirect will be handled by _app.js
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.message.includes('Invalid login credentials')
        ? 'Invalid email or password'
        : 'Failed to login. Please try again.';
      toast({
        title: 'Login Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={8} maxWidth="500px" mx="auto" mt={20}>
      <Heading mb={6} textAlign="center">Login</Heading>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4}>
          <FormControl isRequired>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </FormControl>
          <Button
            type="submit"
            colorScheme="blue"
            width="full"
            isLoading={loading}
            loadingText="Logging in..."
          >
            Login
          </Button>
          <Button
            variant="link"
            colorScheme="blue"
            onClick={() => router.push('/register')}
          >
            Don’t have an account? Register
          </Button>
        </VStack>
      </form>
    </Box>
  );
}