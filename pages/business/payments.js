import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Container,
  useToast,
  Card,
  CardBody,
  VStack,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  FormControl,
  FormLabel,
  Input,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';
import { 
  FaVideo, 
  FaMoneyBillWave, 
  FaInbox, 
  FaSignOutAlt,
  FaChevronDown,
  FaHome,
  FaHistory,
} from 'react-icons/fa';
import axios from 'axios';

export default function Payments() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const toast = useToast();

  useEffect(() => {
    const { data: { subscription }, error } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setSession(session);
    });

    if (error) {
      console.error('Auth state subscription failed:', error.message);
      toast({
        title: 'Authentication Error',
        description: 'Failed to monitor login state',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }

    return () => subscription?.unsubscribe();
  }, [toast]);

  // Separate useEffect for fetching payment history
  useEffect(() => {
    if (user?.id) {
      fetchPaymentHistory();
    }
  }, [user?.id]); // Only fetch when user ID changes

  const fetchPaymentHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('freelancer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch payment history',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handlePayment = async () => {
    if (!user || !session) {
      setError('Please log in to make a payment');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const token = session.access_token;
      
      await axios.post(
        '/api/payments',
        { amount, phone, campaign_id: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: 'Success',
        description: 'Payment initiated successfully!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      fetchPaymentHistory();
      setAmount('');
      setPhone('');
    } catch (error) {
      console.error('Error initiating payment:', error);
      setError('Failed to initiate payment: ' + (error.response?.data?.error || error.message || 'Unknown error'));
      toast({
        title: 'Error',
        description: 'Failed to initiate payment',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error.message);
      toast({
        title: 'Logout Failed',
        description: error.message || 'An error occurred during logout',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (!user) {
    return (
      <Container maxW="container.xl" p={5}>
        <Box p={8} textAlign="center">
          <Text>Authentication required. Redirecting to login...</Text>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" p={[4, 6, 8]}>
      {/* Header Section with Navigation */}
      <Box 
        display="flex" 
        flexDirection={["column", "row"]}
        justifyContent="space-between" 
        alignItems={["flex-start", "center"]} 
        mb={[6, 8, 10]}
        bg="white"
        p={[4, 6]}
        borderRadius="xl"
        boxShadow="sm"
      >
        <Box>
          <Heading size={["lg", "xl", "2xl"]} bgGradient="linear(to-r, blue.500, teal.500)" bgClip="text">
            Payments
          </Heading>
          <Text color="gray.600" mt={2} fontSize={["md", "lg"]}>Manage your payments and view history</Text>
        </Box>
        <HStack 
  spacing={[1, 2, 4]} 
  mt={[2, 4]}
  overflowX="auto"
  w="100%"
  flexWrap="nowrap"
>
  <Button
    onClick={() => router.push('/business/dashboard')}
    colorScheme="blue"
    variant="ghost"
    size={["xs", "sm"]}
    leftIcon={<Icon as={FaHome} />}
    flexShrink={0}
  >
    Dashboard
  </Button>
  <Button
    onClick={() => router.push('/business/campaigns')}
    colorScheme="blue"
    variant="ghost"
    size={["xs", "sm"]}
    leftIcon={<Icon as={FaVideo} />}
    flexShrink={0}
  >
    Campaigns
  </Button>
  <Menu>
    <MenuButton
      as={Button}
      rightIcon={<Icon as={FaChevronDown} />}
      colorScheme="blue"
      variant="ghost"
      size={["xs", "sm"]}
      flexShrink={0}
    >
      More
    </MenuButton>
    <MenuList>
      <MenuItem onClick={() => router.push('/business/payments')}>
        <Icon as={FaMoneyBillWave} mr={2} />
        Payments
      </MenuItem>
      <MenuItem onClick={() => router.push('/business/chat')}>
        <Icon as={FaInbox} mr={2} />
        Chat
      </MenuItem>
      <MenuItem onClick={handleLogout} color="red.500">
        <Icon as={FaSignOutAlt} mr={2} />
        Logout
      </MenuItem>
    </MenuList>
  </Menu>
</HStack>
      </Box>

      {/* Payment Form */}
      <Card bg="white" borderRadius="xl" boxShadow="sm" mb={6}>
        <CardBody>
          <VStack spacing={6} align="stretch">
            <Heading size="md">Make a Payment</Heading>
            {error && (
              <Text color="red.500" p={3} bg="red.50" borderRadius="md">
                {error}
              </Text>
            )}
            <FormControl>
              <FormLabel>Amount (KES)</FormLabel>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                placeholder="Enter amount"
                disabled={isLoading}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Phone Number</FormLabel>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="254XXXXXXXXX"
                disabled={isLoading}
              />
            </FormControl>
            <Button
              onClick={handlePayment}
              isLoading={isLoading}
              loadingText="Processing"
              colorScheme="blue"
              size="lg"
            >
              Pay via M-Pesa
            </Button>
          </VStack>
        </CardBody>
      </Card>

      {/* Payment History */}
      <Card bg="white" borderRadius="xl" boxShadow="sm">
        <CardBody>
          <VStack spacing={6} align="stretch">
            <Flex align="center">
              <Heading size="md">Payment History</Heading>
              <Spacer />
              <Badge colorScheme="blue" fontSize="sm" p={2} borderRadius="md">
                <Icon as={FaHistory} mr={1} />
                Last 30 days
              </Badge>
            </Flex>
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Date</Th>
                    <Th>Amount</Th>
                    <Th>Status</Th>
                    <Th>Reference</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {paymentHistory.map((payment) => (
                    <Tr key={payment.id}>
                      <Td>{new Date(payment.created_at).toLocaleDateString()}</Td>
                      <Td>KES {payment.amount}</Td>
                      <Td>
                        <Badge
                          colorScheme={payment.status === 'completed' ? 'green' : 'yellow'}
                        >
                          {payment.status}
                        </Badge>
                      </Td>
                      <Td>{payment.reference}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </VStack>
        </CardBody>
      </Card>
    </Container>
  );
}