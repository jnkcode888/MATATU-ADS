// pages/register.js
import { useState } from 'react';
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
  Radio,
  RadioGroup,
} from '@chakra-ui/react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('business');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();
  const router = useRouter();

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

      // Set the session in Supabase client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionError) {
        throw new Error('Failed to set session');
      }

      // Redirect based on role
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box p={8} maxWidth="400px" mx="auto">
      <Heading textAlign="center">Sign Up for Matatu Ads</Heading>
      <Text mt={4} textAlign="center">Create an account to get started</Text>
      <Box as="form" mt={8} onSubmit={handleSubmit}>
        <Stack spacing={4}>
          <FormControl id="email" isRequired>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
            />
          </FormControl>
          <FormControl id="password" isRequired>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
          </FormControl>
          <FormControl id="userType" isRequired>
            <FormLabel>I want to:</FormLabel>
            <RadioGroup onChange={setUserType} value={userType}>
              <Stack direction="row">
                <Radio value="business">Advertise (Business)</Radio>
                <Radio value="freelancer">Drive (Freelancer)</Radio>
              </Stack>
            </RadioGroup>
          </FormControl>
          <Button
            type="submit"
            colorScheme="blue"
            width="full"
            mt={4}
            isLoading={isLoading}
          >
            Sign Up
          </Button>
          <Text textAlign="center">
            Already have an account?{' '}
            <Button variant="link" onClick={() => router.push('/')}>
              Log in
            </Button>
          </Text>
        </Stack>
      </Box>
    </Box>
  );
}