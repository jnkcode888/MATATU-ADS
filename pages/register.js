import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Button, FormControl, FormLabel, Input, Select, VStack, useToast, Heading } from '@chakra-ui/react';
import { supabase } from '../lib/supabase';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userType, setUserType] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  // Get user type from query parameter
  useEffect(() => {
    const { type } = router.query;
    if (type) {
      console.log('User type set from query parameter:', type);
      setUserType(type);
    }
  }, [router.query]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Submitting registration with:', { email, name, phoneNumber, userType });

      // Sign up the user with Supabase Auth (email verification is disabled in settings)
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phoneNumber,
            userType,
          },
        },
      });

      if (signUpError) {
        console.error('Sign-up error:', signUpError);
        throw new Error(signUpError.message);
      }

      if (!user) {
        console.error('No user returned from signUp');
        throw new Error('Failed to create user account');
      }

      console.log('User signed up:', user.id);

      // Upsert the user into the users table (insert if not exists, update if exists)
      const { error: upsertError } = await supabase
        .from('users')
        .upsert(
          {
            id: user.id,
            email: user.email,
            name,
            phone_number: phoneNumber,
            user_type: userType,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'id' } // Specify the conflict target (primary key)
        );

      if (upsertError) {
        console.error('Error upserting user into users table:', upsertError);
        throw new Error('Failed to save user data: ' + upsertError.message);
      }

      console.log('User upserted into users table successfully');

      toast({
        title: 'Account Created',
        description: 'Please log in to continue.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Redirect to login page
      router.push('/login');
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: 'Error',
        description: error.message,
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
      <Heading mb={6} textAlign="center">Register</Heading>
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
          <FormControl isRequired>
            <FormLabel>Name</FormLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Phone Number</FormLabel>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter your phone number"
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>User Type</FormLabel>
            <Select
              value={userType}
              onChange={(e) => {
                console.log('User type set from form:', e.target.value);
                setUserType(e.target.value);
              }}
              placeholder="Select user type"
            >
              <option value="business">Business</option>
              <option value="freelancer">Freelancer</option>
            </Select>
          </FormControl>
          <Button
            type="submit"
            colorScheme="blue"
            width="full"
            isLoading={loading}
            loadingText="Registering..."
          >
            Register
          </Button>
          <Button
            variant="link"
            colorScheme="blue"
            onClick={() => router.push('/login')}
          >
            Already have an account? Login
          </Button>
        </VStack>
      </form>
    </Box>
  );
}