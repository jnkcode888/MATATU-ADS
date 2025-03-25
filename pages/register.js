import { useState, useEffect } from 'react'; // Added useEffect import
import {
  Box, Heading, Text, Button, Input, FormControl, FormLabel, Stack, useToast, Select, Alert,
  AlertIcon, Link, Divider, HStack
} from '@chakra-ui/react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import { FcGoogle } from 'react-icons/fc';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('business');
  const [userType, setUserType] = useState('business');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();
  const router = useRouter();

  // Debug logs
  useEffect(() => {
    console.log('Google Client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_KEY);
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
          role,
          phone,
          userType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      if (data.requiresVerification) {
        toast({
          title: 'Registration successful!',
          description: 'Please check your email to verify your account.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setTimeout(() => {
          router.push('/verify-email');
        }, 3000);
        return;
      }

      if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'business') {
        router.push('/business/dashboard');
      } else {
        router.push('/freelancer/dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message);
      toast({
        title: 'Registration failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box p={8} maxWidth="400px" mx="auto">
      <Heading textAlign="center">Sign Up for Matatu Ads</Heading>
      <Text mt={4} textAlign="center">Create an account to get started</Text>
      
      {/* Google Sign In Button */}
      <Box mt={8}>
        <Button
          onClick={handleGoogleSignIn}
          isLoading={isGoogleLoading}
          loadingText="Signing in..."
          w="100%"
          variant="outline"
          leftIcon={<FcGoogle />}
          size="lg"
        >
          Continue with Google
        </Button>
      </Box>

      <HStack my={8} spacing={4}>
        <Divider flex={1} />
        <Text color="gray.500" fontSize="sm">or</Text>
        <Divider flex={1} />
      </HStack>

      <Box as="form" onSubmit={handleSubmit}>
        <Stack spacing={4}>
          <FormControl id="email" isRequired>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </FormControl>

          <FormControl id="password" isRequired>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </FormControl>

          <FormControl id="name" isRequired>
            <FormLabel>Full Name</FormLabel>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
            />
          </FormControl>

          <FormControl id="phone" isRequired>
            <FormLabel>Phone Number</FormLabel>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
            />
          </FormControl>

          <FormControl id="role" isRequired>
            <FormLabel>Account Type</FormLabel>
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="business">Business</option>
              <option value="freelancer">Brand Ambassador</option>
            </Select>
          </FormControl>

          {error && (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            colorScheme="blue"
            isLoading={isLoading}
            loadingText="Creating account..."
          >
            Create Account
          </Button>

          <Text textAlign="center">
            Already have an account?{' '}
            <Link href="/" color="blue.500">
              Sign in
            </Link>
          </Text>
        </Stack>
      </Box>
    </Box>
  );
}