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
  Badge,
  Flex,
  Spacer,
  Progress,
  Divider,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
} from '@chakra-ui/react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/router';
import { 
  FaVideo, 
  FaMoneyBillWave, 
  FaInbox, 
  FaSignOutAlt,
  FaChevronDown,
  FaHome,
  FaUsers,
  FaChartLine,
  FaClock,
  FaArrowLeft,
  FaMapMarkerAlt,
  FaRoute,
  FaPhone,
} from 'react-icons/fa';

export default function CampaignDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const { data: { subscription }, error } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
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

  useEffect(() => {
    if (id === 'create') {
      router.push('/business/campaigns/create');
      return;
    }
    if (id && user?.id) {
      fetchCampaignDetails();
    }
  }, [id, user?.id, router]);

  const fetchCampaignDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .eq('business_id', user.id)
        .single();

      if (error) throw error;
      setCampaign(data);
    } catch (error) {
      console.error('Error fetching campaign details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch campaign details',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <Container maxW="container.xl" p={5}>
        <Box p={8} textAlign="center">
          <Text>Loading campaign details...</Text>
        </Box>
      </Container>
    );
  }

  if (!campaign) {
    return (
      <Container maxW="container.xl" p={5}>
        <Box p={8} textAlign="center">
          <Text>Campaign not found</Text>
          <Button
            mt={4}
            leftIcon={<Icon as={FaArrowLeft} />}
            onClick={() => router.push('/business/campaigns')}
          >
            Back to Campaigns
          </Button>
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
          <Button
            variant="ghost"
            leftIcon={<Icon as={FaArrowLeft} />}
            onClick={() => router.push('/business/campaigns')}
            mb={4}
          >
            Back to Campaigns
          </Button>
          <Heading size={["lg", "xl", "2xl"]} bgGradient="linear(to-r, blue.500, teal.500)" bgClip="text">
            Campaign Details
          </Heading>
          <Text color="gray.600" mt={2} fontSize={["md", "lg"]}>View and manage your campaign</Text>
        </Box>
        <HStack spacing={[2, 4]} mt={[4, 0]}>
          <Button
            onClick={() => router.push('/business/campaigns')}
            colorScheme="blue"
            variant="ghost"
            size="sm"
            leftIcon={<Icon as={FaVideo} />}
          >
            Campaigns
          </Button>
          <Button
            onClick={() => router.push('/business/payments')}
            colorScheme="blue"
            variant="ghost"
            size="sm"
            leftIcon={<Icon as={FaMoneyBillWave} />}
          >
            Payments
          </Button>
          <Button
            onClick={() => router.push('/business/chat')}
            colorScheme="blue"
            variant="ghost"
            size="sm"
            leftIcon={<Icon as={FaInbox} />}
          >
            Chat
          </Button>
          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<Icon as={FaChevronDown} />}
              colorScheme="blue"
              variant="ghost"
              size="sm"
            >
              More
            </MenuButton>
            <MenuList>
              <MenuItem 
                onClick={() => router.push('/business/dashboard')}
                bg="blue.50"
                _hover={{ bg: 'blue.100' }}
                fontWeight="medium"
              >
                <Icon as={FaHome} mr={2} color="blue.500" />
                Dashboard
              </MenuItem>
              <MenuItem onClick={handleLogout} color="red.500">
                <Icon as={FaSignOutAlt} mr={2} />
                Logout
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Box>

      {/* Campaign Details */}
      <Grid templateColumns={["1fr", "1fr", "2fr 1fr"]} gap={6}>
        <GridItem>
          <Card bg="white" borderRadius="xl" boxShadow="sm">
            <CardBody>
              <VStack spacing={6} align="stretch">
                <Flex align="center">
                  <Heading size="lg">{campaign.product_name}</Heading>
                  <Spacer />
                  <Badge colorScheme={campaign.status === 'active' ? 'green' : 'gray'} fontSize="md" p={2}>
                    {campaign.status}
                  </Badge>
                </Flex>

                <Divider />

                <Box>
                  <Text fontSize="lg" fontWeight="medium" mb={2}>Campaign Script</Text>
                  <Text color="gray.600" whiteSpace="pre-wrap">{campaign.script}</Text>
                </Box>

                <Box>
                  <Text fontSize="lg" fontWeight="medium" mb={2}>Route</Text>
                  <HStack>
                    <Icon as={FaRoute} color="gray.500" />
                    <Text color="gray.600">{campaign.route}</Text>
                  </HStack>
                </Box>

                <Box>
                  <Text fontSize="lg" fontWeight="medium" mb={2}>Contact</Text>
                  <HStack>
                    <Icon as={FaPhone} color="gray.500" />
                    <Text color="gray.600">{campaign.phone_number}</Text>
                  </HStack>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <VStack spacing={6}>
            <Card bg="white" borderRadius="xl" boxShadow="sm" w="100%">
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Campaign Stats</Heading>
                  <Stat>
                    <StatLabel>Trips Remaining</StatLabel>
                    <StatNumber>{campaign.trips_remaining}</StatNumber>
                    <StatHelpText>
                      <StatArrow type="decrease" />
                      {campaign.trips_needed - campaign.trips_remaining} completed
                    </StatHelpText>
                  </Stat>
                  <Stat>
                    <StatLabel>Budget</StatLabel>
                    <StatNumber>KES {campaign.budget}</StatNumber>
                    <StatHelpText>Price per trip: KES {campaign.price_per_trip}</StatHelpText>
                  </Stat>
                  <Stat>
                    <StatLabel>Deadline</StatLabel>
                    <StatNumber>{new Date(campaign.deadline).toLocaleDateString()}</StatNumber>
                    <StatHelpText>
                      <StatArrow type="decrease" />
                      {Math.ceil((new Date(campaign.deadline) - new Date()) / (1000 * 60 * 60 * 24))} days remaining
                    </StatHelpText>
                  </Stat>
                </VStack>
              </CardBody>
            </Card>

            <Card bg="white" borderRadius="xl" boxShadow="sm" w="100%">
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Campaign Progress</Heading>
                  <Box>
                    <Text fontSize="sm" color="gray.500" mb={2}>Trips Completed</Text>
                    <Progress 
                      value={(campaign.trips_needed - campaign.trips_remaining) / campaign.trips_needed * 100} 
                      colorScheme="blue" 
                      borderRadius="full" 
                    />
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        </GridItem>
      </Grid>
    </Container>
  );
} 