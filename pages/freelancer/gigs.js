import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Container,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  SimpleGrid,
  Badge,
  useToast,
  VStack,
  Input,
  FormControl,
  FormLabel,
  Icon,
  HStack,
  Progress,
  Divider,
  Card,
  CardBody,
  Select,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { 
  FaUser, 
  FaBriefcase, 
  FaChevronLeft, 
  FaChevronRight,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaClock,
  FaVideo,
  FaCheckCircle,
  FaExclamationCircle,
  FaChevronDown,
  FaSignOutAlt,
} from 'react-icons/fa';

export default function FreelancerGigs() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [tripsToDo, setTripsToDo] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('deadline');

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: 'Logout Error',
        description: 'Failed to log out. Please try again later.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          setError('Session not found. Please log in again.');
          setLoading(false);
          return;
        }

        const authUser = session.user;
        setUser(authUser);

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id, email, user_type, name, gender, phone_number, preferred_routes, location, gigs_completed, impressions, analytics, rating')
          .eq('id', authUser.id)
          .single();
        if (profileError) throw profileError;
        if (!profile) throw new Error('No profile data found for this user.');
        setUserData(profile);

        if (profile.user_type !== 'freelancer') {
          setError("You don't have access to this section.");
          setLoading(false);
          return;
        }

        fetchCampaigns();
      } catch (err) {
        console.error('Error in initialize:', err);
        setError('Failed to load campaigns: ' + err.message);
        setLoading(false);
      }
    };

    initialize();
  }, [page]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(`/api/gigs?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch campaigns');

      const validCampaigns = data.campaigns.filter(campaign => 
        campaign.budget > 0 && campaign.route !== null && campaign.available_gigs > 0
      );

      console.log('Fetched campaigns for freelancer:', JSON.stringify(validCampaigns, null, 2));
      setCampaigns(validCampaigns);
      setTotalPages(data.totalPages);

      setTripsToDo(prev => {
        const newState = { ...prev };
        validCampaigns.forEach(campaign => {
          if (newState[campaign.id] === undefined && campaign.available_gigs > 0) {
            newState[campaign.id] = 1;
          }
        });
        return newState;
      });
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to fetch campaigns: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTripsChange = (campaignId, value) => {
    const numValue = value === '' ? '' : Math.max(1, parseInt(value, 10) || 1);
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    const maxTrips = campaign.available_gigs;
    setTripsToDo(prev => ({
      ...prev,
      [campaignId]: numValue === '' ? '' : Math.min(numValue, maxTrips),
    }));
  };

  const handleAcceptCampaign = async (campaignId) => {
    const tripsRequested = Number(tripsToDo[campaignId]) || 1;
    if (tripsRequested < 1) {
      toast({
        title: 'Error',
        description: 'Please specify a valid number of trips.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) throw new Error('Campaign not found');

      if (tripsRequested > campaign.available_gigs) {
        throw new Error(`Only ${campaign.available_gigs} gigs available.`);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/gigs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          status: 'assigned',
          trips_to_assign: tripsRequested,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to accept campaign');

      toast({
        title: 'Campaign Accepted',
        description: `Accepted ${tripsRequested} trip${tripsRequested !== 1 ? 's' : ''} for campaign #${campaignId}.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setTripsToDo(prev => {
        const newTripsToDo = { ...prev };
        delete newTripsToDo[campaignId];
        return newTripsToDo;
      });

      await fetchCampaigns();
    } catch (err) {
      console.error('Error accepting campaign:', err);
      toast({
        title: 'Error',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const calculatePotentialEarnings = (trips) => {
    const tripsRequested = Number(trips) || 0;
    const freelancerPayoutPerTrip = 500; // Fixed freelancer payout
    return tripsRequested * freelancerPayoutPerTrip;
  };

  // Filter and sort campaigns
  const filteredCampaigns = campaigns
    .filter(campaign => {
      if (filterStatus === 'all') return true;
      return campaign.status === filterStatus;
    })
    .filter(campaign => 
      campaign.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.id.toString().includes(searchQuery)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          return new Date(a.deadline) - new Date(b.deadline);
        case 'earnings':
          return calculatePotentialEarnings(b.trips_needed) - calculatePotentialEarnings(a.trips_needed);
        case 'trips':
          return b.trips_needed - a.trips_needed;
        default:
          return 0;
      }
    });

  if (loading) return <Box p={8} textAlign="center"><Spinner size="xl" /></Box>;
  if (error) return (
    <Box p={8}>
      <Alert status="error">
        <AlertIcon />
        <AlertTitle>{error}</AlertTitle>
      </Alert>
      <Button mt={4} onClick={() => router.push('/')}>Back to Login</Button>
    </Box>
  );
  if (!user || !userData) return (
    <Box p={8}>
      <Alert status="warning">
        <AlertIcon />
        <AlertTitle>Access denied or user data not found.</AlertTitle>
      </Alert>
      <Button mt={4} onClick={() => router.push('/')}>Back to Login</Button>
    </Box>
  );

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
          <Heading size={["lg", "xl", "2xl"]} bgGradient="linear(to-r, purple.500, blue.500)" bgClip="text">
            Available Gigs
          </Heading>
          <Text color="gray.600" mt={2} fontSize={["md", "lg"]}>Browse and accept available campaigns</Text>
        </Box>
        <HStack spacing={[2, 4]} mt={[4, 0]}>
          <Button
            onClick={() => router.push('/freelancer/earnings')}
            colorScheme="blue"
            variant="ghost"
            size="sm"
            leftIcon={<Icon as={FaMoneyBillWave} />}
          >
            Earnings
          </Button>
          <Button
            onClick={() => router.push('/freelancer/upload')}
            colorScheme="blue"
            variant="ghost"
            size="sm"
            leftIcon={<Icon as={FaVideo} />}
          >
            Upload
          </Button>
          <Button
            onClick={() => router.push('/freelancer/profile')}
            colorScheme="blue"
            variant="ghost"
            size="sm"
            leftIcon={<Icon as={FaUser} />}
          >
            Profile
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
              <MenuItem onClick={handleLogout} color="red.500">
                <Icon as={FaSignOutAlt} mr={2} />
                Logout
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Box>

      {/* Filters Section */}
      <Card mb={8}>
        <CardBody>
          <SimpleGrid columns={[1, 2, 3]} spacing={4}>
            <FormControl>
              <FormLabel>Status</FormLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Search</FormLabel>
              <Input
                placeholder="Search by campaign name or ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Sort By</FormLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="deadline">Deadline</option>
                <option value="earnings">Potential Earnings</option>
                <option value="trips">Number of Trips</option>
              </Select>
            </FormControl>
          </SimpleGrid>
        </CardBody>
      </Card>

      {campaigns.length === 0 ? (
        <Box 
          textAlign="center" 
          p={8} 
          bg="white" 
          borderRadius="xl" 
          boxShadow="sm"
        >
          <Icon as={FaBriefcase} w={12} h={12} color="gray.400" mb={4} />
          <Text fontSize="xl" color="gray.600">No available campaigns at the moment.</Text>
          <Text mt={2} color="gray.500">Check back later for new opportunities!</Text>
        </Box>
      ) : (
        <VStack spacing={6} align="stretch">
          <SimpleGrid columns={[1, 2, 3]} spacing={6}>
            {filteredCampaigns.map((campaign) => (
              <Box 
                key={campaign.id} 
                p={6} 
                borderWidth="1px" 
                borderRadius="xl"
                bg="white"
                boxShadow="sm"
                transition="all 0.2s"
                _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
              >
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text 
                        fontWeight="bold" 
                        fontSize="xl" 
                        color="blue.600"
                      >
                        Campaign #{campaign.id}
                      </Text>
                      <Badge colorScheme="green">
                        {campaign.status}
                      </Badge>
                    </HStack>
                    <Text 
                      fontSize="lg" 
                      fontWeight="medium"
                      color="gray.700"
                      mb={2}
                    >
                      {campaign.product_name || 'Unknown'}
                    </Text>
                  </Box>

                  <Divider />

                  <VStack align="stretch" spacing={3}>
                    <Box>
                      <HStack mb={1}>
                        <Icon as={FaMapMarkerAlt} color="blue.500" />
                        <Text color="gray.600" fontSize="sm">Route</Text>
                      </HStack>
                      <Text fontWeight="medium">{campaign.route || 'N/A'}</Text>
                    </Box>

                    <Box>
                      <HStack mb={1}>
                        <Icon as={FaMoneyBillWave} color="green.500" />
                        <Text color="gray.600" fontSize="sm">Budget</Text>
                      </HStack>
                      <Text fontWeight="medium" color="green.600">
                        KSh {campaign.budget.toLocaleString()}
                      </Text>
                    </Box>

                    <Box>
                      <HStack mb={1}>
                        <Icon as={FaVideo} color="purple.500" />
                        <Text color="gray.600" fontSize="sm">Payout per Trip</Text>
                      </HStack>
                      <Text fontWeight="medium" color="purple.600">
                        KSh 500
                      </Text>
                    </Box>

                    <Box>
                      <HStack mb={1}>
                        <Icon as={FaCheckCircle} color="blue.500" />
                        <Text color="gray.600" fontSize="sm">Available Gigs</Text>
                      </HStack>
                      <Text fontWeight="medium">{campaign.available_gigs}</Text>
                    </Box>

                    <Box>
                      <HStack mb={1}>
                        <Icon as={FaClock} color="yellow.500" />
                        <Text color="gray.600" fontSize="sm">Total Trips</Text>
                      </HStack>
                      <Text fontWeight="medium">{campaign.total_trips}</Text>
                    </Box>
                  </VStack>

                  <Divider />

                  <FormControl>
                    <FormLabel fontSize="sm">Trips to Commit</FormLabel>
                    <Input
                      type="number"
                      min="1"
                      max={campaign.available_gigs}
                      value={tripsToDo[campaign.id] || ''}
                      onChange={(e) => handleTripsChange(campaign.id, e.target.value)}
                      placeholder="Enter trips"
                      step="1"
                      disabled={campaign.available_gigs <= 0}
                      size="sm"
                    />
                  </FormControl>

                  <Box 
                    p={3} 
                    bg="green.50" 
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="green.200"
                  >
                    <HStack justify="space-between">
                      <Text color="gray.600" fontSize="sm">Potential Earnings</Text>
                      <Text fontWeight="bold" color="green.600" fontSize="lg">
                        KSh {calculatePotentialEarnings(tripsToDo[campaign.id]).toLocaleString()}
                      </Text>
                    </HStack>
                  </Box>

                  <Box>
                    <HStack mb={1}>
                      <Icon as={FaClock} color="red.500" />
                      <Text color="gray.600" fontSize="sm">Gig Deadline</Text>
                    </HStack>
                    <Badge 
                      colorScheme={new Date(campaign.gig_deadline) < new Date() ? 'red' : 'yellow'}
                      display="flex"
                      alignItems="center"
                      p={2}
                      borderRadius="md"
                    >
                      <Icon 
                        as={new Date(campaign.gig_deadline) < new Date() ? FaExclamationCircle : FaClock} 
                        mr={1} 
                      />
                      {campaign.gig_deadline ? new Date(campaign.gig_deadline).toLocaleString() : 'Not Set'}
                    </Badge>
                  </Box>

                  <Button
                    colorScheme="blue"
                    onClick={() => handleAcceptCampaign(campaign.id)}
                    isDisabled={
                      campaign.available_gigs <= 0 ||
                      !tripsToDo[campaign.id] ||
                      tripsToDo[campaign.id] <= 0
                    }
                    size="lg"
                    w="full"
                    leftIcon={<Icon as={FaCheckCircle} />}
                  >
                    Accept {tripsToDo[campaign.id] || 1} Trip{tripsToDo[campaign.id] !== 1 ? 's' : ''}
                  </Button>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>

          <Box 
            display="flex" 
            justifyContent="space-between" 
            mt={6}
            bg="white"
            p={4}
            borderRadius="xl"
            boxShadow="sm"
          >
            <Button 
              onClick={() => setPage(p => Math.max(p - 1, 1))} 
              isDisabled={page === 1}
              leftIcon={<Icon as={FaChevronLeft} />}
            >
              Previous
            </Button>
            <Text fontWeight="medium">Page {page} of {totalPages}</Text>
            <Button 
              onClick={() => setPage(p => Math.min(p + 1, totalPages))} 
              isDisabled={page === totalPages}
              rightIcon={<Icon as={FaChevronRight} />}
            >
              Next
            </Button>
          </Box>
        </VStack>
      )}
    </Container>
  );
}