// pages/business/campaigns.js
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
  SimpleGrid,
  Badge,
  Flex,
  Spacer,
  Progress,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
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
  FaPlus,
  FaUsers,
  FaChartLine,
  FaClock,
} from 'react-icons/fa';
import CreateCampaignModal from '../../components/CreateCampaignModal';

export default function Campaigns() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [pendingCampaignData, setPendingCampaignData] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const toast = useToast();

  useEffect(() => {
    console.log('Auth useEffect running');
    const { data: { subscription }, error } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, 'User:', session?.user?.id);
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
    if (user?.id) {
      console.log('User detected, fetching campaigns');
      fetchCampaigns();
    } else {
      console.log('No user, waiting for auth state');
    }
  }, [user]);

  const fetchCampaigns = async () => {
    console.log('fetchCampaigns called');
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('business_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Campaigns fetched:', data);
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error.message);
      toast({
        title: 'Error',
        description: 'Failed to fetch campaigns',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      console.log('Setting loading to false');
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

  const handleCreateCampaign = async (campaignData) => {
    console.log('handleCreateCampaign called with:', campaignData);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) throw new Error('User not authenticated');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('phone_number')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      if (!userData?.phone_number) {
        setPendingCampaignData(campaignData);
        setIsCreateModalOpen(false);
        setIsPhoneModalOpen(true);
        return;
      }

      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert([{
          business_id: user.id,
          product_name: campaignData.product_name,
          script: campaignData.script,
          route: campaignData.route,
          phone_number: userData.phone_number,
          trips_needed: campaignData.trips_needed,
          budget: campaignData.budget,
          price_per_trip: campaignData.price_per_trip,
          trips_remaining: campaignData.trips_needed,
          deadline: campaignData.deadline,
          status: 'active',
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (campaignError) throw campaignError;

      const response = await fetch('/api/create-gigs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          tripsNeeded: campaign.trips_needed,
          deadline: campaign.deadline,
          pricePerTrip: campaign.price_per_trip,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create gigs');
      }

      setIsCreateModalOpen(false);
      setShowSuccessModal(true);
      fetchCampaigns();

      toast({
        title: 'Campaign Created',
        description: 'Your campaign has been created successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error creating campaign:', error.message);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create campaign',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handlePhoneSubmit = async () => {
    setPhoneLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) throw new Error('User not authenticated');

      const { error: updateError } = await supabase
        .from('users')
        .update({ phone_number: phoneNumber })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Phone Number Added',
        description: 'Phone number updated successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setIsPhoneModalOpen(false);
      if (pendingCampaignData) {
        handleCreateCampaign(pendingCampaignData);
        setPendingCampaignData(null);
      }
    } catch (error) {
      console.error('Error saving phone number:', error.message);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save phone number',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setPhoneLoading(false);
    }
  };

  console.log('Rendering Campaigns, loading:', loading, 'isCreateModalOpen:', isCreateModalOpen);

  if (loading) {
    return (
      <Container maxW="container.xl" p={5}>
        <Box p={8} textAlign="center">
          <Text>Loading campaigns...</Text>
        </Box>
      </Container>
    );
  }

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
            Campaigns
          </Heading>
          <Text color="gray.600" mt={2} fontSize={["md", "lg"]}>Manage your advertising campaigns</Text>
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
    onClick={() => router.push('/business/payments')}
    colorScheme="blue"
    variant="ghost"
    size={["xs", "sm"]}
    leftIcon={<Icon as={FaMoneyBillWave} />}
    flexShrink={0}
  >
    Payments
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
      <MenuItem onClick={() => router.push('/business/campaigns')}>
        <Icon as={FaVideo} mr={2} />
        Campaigns
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

      <Box mb={6}>
        <Button
          onClick={() => {
            console.log('Create New Campaign clicked, setting isCreateModalOpen to true');
            setIsCreateModalOpen(true);
          }}
          colorScheme="blue"
          leftIcon={<Icon as={FaPlus} />}
          size="lg"
        >
          Create New Campaign
        </Button>
      </Box>

      <CreateCampaignModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          console.log('Closing CreateCampaignModal');
          setIsCreateModalOpen(false);
        }}
        onSuccess={handleCreateCampaign}
      />

      <Modal isOpen={isPhoneModalOpen} onClose={() => setIsPhoneModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Phone Number</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4}>Please add your phone number to continue.</Text>
            <FormControl isRequired>
              <FormLabel>Phone Number</FormLabel>
              <Input
                type="tel"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsPhoneModalOpen(false)}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handlePhoneSubmit}
              isLoading={phoneLoading}
            >
              Submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal 
        isOpen={showSuccessModal} 
        onClose={() => setShowSuccessModal(false)}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalBody p={8}>
            <Alert
              status="success"
              variant="subtle"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              textAlign="center"
              borderRadius="lg"
              py={6}
            >
              <AlertIcon boxSize="40px" mr={0} />
              <AlertTitle mt={4} mb={1} fontSize="lg">
                Campaign Created Successfully!
              </AlertTitle>
              <AlertDescription maxWidth="sm">
                Your campaign is now live.
              </AlertDescription>
            </Alert>
          </ModalBody>
          <ModalFooter justifyContent="center">
            <Button colorScheme="blue" onClick={() => setShowSuccessModal(false)}>
              Got it
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <SimpleGrid columns={[1, 1, 2, 3]} spacing={6}>
        {campaigns.map((campaign) => (
          <Card key={campaign.id} bg="white" borderRadius="xl" boxShadow="sm" _hover={{ transform: 'translateY(-4px)', boxShadow: 'md' }} transition="all 0.2s">
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Flex align="center">
                  <Heading size="md">{campaign.product_name || 'Untitled'}</Heading>
                  <Spacer />
                  <Badge colorScheme={campaign.status === 'active' ? 'green' : 'gray'}>
                    {campaign.status}
                  </Badge>
                </Flex>
                <Text color="gray.600" noOfLines={2}>
                  {campaign.script || 'No script provided'}
                </Text>
                <Box>
                  <Text fontSize="sm" color="gray.500" mb={2}>Progress</Text>
                  <Progress 
                    value={((campaign.trips_needed - campaign.trips_remaining) / campaign.trips_needed * 100) || 0} 
                    colorScheme="blue" 
                    borderRadius="full" 
                  />
                </Box>
                <HStack spacing={4} justify="space-between">
                  <HStack>
                    <Icon as={FaUsers} color="gray.500" />
                    <Text fontSize="sm">{campaign.route || 'N/A'}</Text>
                  </HStack>
                  <HStack>
                    <Icon as={FaClock} color="gray.500" />
                    <Text fontSize="sm">{new Date(campaign.created_at).toLocaleDateString()}</Text>
                  </HStack>
                </HStack>
                <HStack spacing={4} justify="space-between">
                  <HStack>
                    <Icon as={FaChartLine} color="gray.500" />
                    <Text fontSize="sm">KES {campaign.budget || 0}</Text>
                  </HStack>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    variant="outline"
                    onClick={() => router.push(`/business/campaigns/${campaign.id}`)}
                  >
                    View Details
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {campaigns.length === 0 && !loading && (
        <Card bg="white" borderRadius="xl" boxShadow="sm">
          <CardBody textAlign="center" py={10}>
            <Icon as={FaVideo} w={12} h={12} color="gray.400" mb={4} />
            <Heading size="md" mb={2}>No Campaigns Yet</Heading>
            <Text color="gray.600" mb={4}>
              Create your first campaign to start advertising
            </Text>
            <Button
              colorScheme="blue"
              leftIcon={<Icon as={FaPlus} />}
              onClick={() => {
                console.log('Empty state Create Campaign clicked');
                setIsCreateModalOpen(true);
              }}
            >
              Create Campaign
            </Button>
          </CardBody>
        </Card>
      )}
    </Container>
  );
}