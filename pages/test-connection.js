// pages/test-connection.js
import { useState, useEffect } from 'react';
import { Box, Heading, Text, Button, Code, Alert, AlertIcon, Stack } from '@chakra-ui/react';
import { supabase } from '../lib/auth';

export default function TestConnection() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const connectionResult = await supabase.auth.signIn({ email: 'test@example.com', password: 'test' });
      setResult(connectionResult);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={8} maxWidth="800px" mx="auto">
      <Heading mb={4}>Supabase Connection Test</Heading>
      <Text mb={4}>
        This page tests the connection to your Supabase database and checks if authentication is working properly.
      </Text>
      
      <Button colorScheme="blue" onClick={runTest} isLoading={loading} mb={6}>
        Test Connection
      </Button>
      
      {result && (
        <Box mt={4} p={4} borderWidth="1px" borderRadius="md">
          <Stack spacing={4}>
            <Alert status={result.success ? "success" : "error"}>
              <AlertIcon />
              {result.success 
                ? "Connection successful! Your Supabase configuration is working."
                : "Connection failed. Check the error details below."
              }
            </Alert>
            
            <Box>
              <Heading size="sm" mb={2}>Connection Result:</Heading>
              <Code p={3} display="block" whiteSpace="pre-wrap" borderRadius="md">
                {JSON.stringify(result, null, 2)}
              </Code>
            </Box>
            
            {!result.success && (
              <Box mt={4}>
                <Heading size="sm" mb={2}>Troubleshooting Tips:</Heading>
                <Stack spacing={2}>
                  <Text>1. Check that your .env.local file has the correct Supabase URL and key</Text>
                  <Text>2. Verify your Supabase service is running</Text>
                  <Text>3. Check if you have proper permissions to access the users table</Text>
                  <Text>4. Ensure the users table exists in your database</Text>
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
}