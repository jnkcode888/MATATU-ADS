import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Container,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  SimpleGrid,
  VStack,
  HStack,
  Badge,
  Icon,
  FormControl,
  FormLabel,
  Input,
  Select,
  Radio,
  RadioGroup,
  Stack,
  Progress,
  Divider,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { FaUser, FaExclamationCircle, FaCheckCircle, FaChartLine, FaStar, FaRoute, FaVideo, FaMoneyBillWave, FaMapMarkerAlt, FaPhone, FaEnvelope, FaTimesCircle, FaExclamationTriangle, FaTrash, FaEdit, FaSave, FaUserTie, FaCalendarAlt, FaUpload, FaBriefcase, FaChartBar, FaSignOutAlt, FaChevronDown } from 'react-icons/fa';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// StatCard component definition
const StatCard = ({ title, value, icon, colorScheme, description }) => (
  <Box
    bg="white"
    p={[4, 6]}
    borderRadius="xl"
    boxShadow="sm"
    _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
    transition="all 0.2s"
  >
    <Stat>
      <StatLabel fontSize={["md", "lg"]} color="gray.600">{title}</StatLabel>
      <StatNumber fontSize={["xl", "2xl"]} color={`${colorScheme}.500`}>
        {value}
      </StatNumber>
      <StatHelpText fontSize={["sm", "md"]} color="gray.500">
        {description}
      </StatHelpText>
    </Stat>
  </Box>
);

export default function FreelancerProfile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    phone_number: '',
    preferred_routes: '',
    location: '',
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    completedGigs: 0,
    activeGigs: 0,
    rating: 0,
    impressions: 0
  });

  const toast = useToast();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();

  // Initial session and profile check
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session fetch error:', error);
        setError('Failed to fetch session');
        setLoading(false);
        return;
      }

      if (!session) {
        router.push('/');
        return;
      }

      setUser(session.user);

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile || profile.user_type !== 'freelancer') {
        router.push('/');
        return;
      }

      // Normalize preferred_routes during initial fetch
      let normalizedPreferredRoutes = [];
      if (profile.preferred_routes) {
        if (typeof profile.preferred_routes === 'string') {
          try {
            const parsed = JSON.parse(profile.preferred_routes);
            if (Array.isArray(parsed)) {
              normalizedPreferredRoutes = parsed.flatMap(item =>
                typeof item === 'string' ? JSON.parse(item) : item
              );
            } else {
              normalizedPreferredRoutes = [parsed];
            }
          } catch (e) {
            console.error('Failed to parse preferred_routes in checkSession:', e);
            normalizedPreferredRoutes = profile.preferred_routes.split(',').map(route => route.trim()).filter(route => route);
          }
        } else if (Array.isArray(profile.preferred_routes)) {
          normalizedPreferredRoutes = profile.preferred_routes;
        }
      }

      setUserData({
        ...profile,
        preferred_routes: normalizedPreferredRoutes,
      });
      setLoading(false);
    };

    checkSession();
  }, [router]);

  // Profile initialization and stats fetching
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

        console.log('Fetching profile for user ID:', authUser.id);
        let profile = null;
        const { data: fetchedProfile, error: profileError } = await supabase
          .from('users')
          .select('id, email, user_type, name, gender, phone_number, preferred_routes, location, gigs_completed, impressions, analytics, verified, rating, ratings_count, created_at, updated_at')
          .eq('id', authUser.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          if (profileError.code === 'PGRST116') {
            console.log('Profile not found, creating a new profile for user:', authUser.id);
            const { data: existingUser, error: emailCheckError } = await supabase
              .from('users')
              .select('id')
              .eq('email', authUser.email)
              .single();

            if (emailCheckError && emailCheckError.code !== 'PGRST116') {
              throw emailCheckError;
            }

            if (existingUser) {
              const { data: updatedProfile, error: updateError } = await supabase
                .from('users')
                .update({
                  id: authUser.id,
                  user_type: 'freelancer',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  phone_number: '+0000000000',
                })
                .eq('email', authUser.email)
                .select()
                .single();

              if (updateError) {
                console.error('Error updating profile:', updateError);
                throw updateError;
              }
              profile = updatedProfile;
            } else {
              const { data: newProfile, error: insertError } = await supabase
                .from('users')
                .insert({
                  id: authUser.id,
                  email: authUser.email,
                  user_type: 'freelancer',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  phone_number: '+0000000000',
                })
                .select()
                .single();

              if (insertError) {
                console.error('Error creating profile:', insertError);
                throw insertError;
              }
              profile = newProfile;
            }
          } else {
            throw profileError;
          }
        } else {
          profile = fetchedProfile;
        }

        if (!profile) {
          throw new Error('No profile data found or created for this user.');
        }

        console.log('Profile data:', profile);

        // Properly parse preferred_routes
        let normalizedPreferredRoutes = [];
        if (profile.preferred_routes) {
          if (typeof profile.preferred_routes === 'string') {
            try {
              const parsed = JSON.parse(profile.preferred_routes);
              if (Array.isArray(parsed)) {
                normalizedPreferredRoutes = parsed.flatMap(item =>
                  typeof item === 'string' ? JSON.parse(item) : item
                );
              } else {
                normalizedPreferredRoutes = [parsed];
              }
            } catch (e) {
              console.error('Failed to parse preferred_routes:', e);
              normalizedPreferredRoutes = profile.preferred_routes.split(',').map(route => route.trim()).filter(route => route);
            }
          } else if (Array.isArray(profile.preferred_routes)) {
            normalizedPreferredRoutes = profile.preferred_routes;
          }
        }

        console.log('Normalized preferred_routes:', normalizedPreferredRoutes);

        setUserData({
          ...profile,
          preferred_routes: normalizedPreferredRoutes,
        });
        setFormData({
          name: profile.name || '',
          gender: profile.gender || '',
          phone_number: profile.phone_number || '',
          preferred_routes: normalizedPreferredRoutes.join(', '),
          location: profile.location || '',
        });

        if (profile.phone_number === '+0000000000') {
          setEditMode(true);
          setFormError('Please provide a valid phone number for payouts.');
        }

        // Fetch stats
        const { data: gigsData, error: gigsError } = await supabase
          .from('gigs')
          .select('*')
          .eq('freelancer_id', authUser.id);

        if (gigsError) throw gigsError;

        const completedGigs = gigsData.filter(gig => gig.status === 'completed').length;
        const activeGigs = gigsData.filter(gig => gig.status === 'assigned').length;
        const totalEarnings = gigsData
          .filter(gig => gig.status === 'completed')
          .reduce((sum, gig) => sum + (gig.freelancer_payout_per_trip * gig.trips_assigned), 0);

        setStats({
          totalEarnings,
          completedGigs,
          activeGigs,
          rating: profile.rating || 0,
          impressions: profile.impressions || 0
        });

        setLoading(false);
      } catch (err) {
        console.error('Error in initialize:', err);
        setError('Failed to load profile: ' + err.message);
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // Updated handleLogout function
  const handleLogout = async () => {
    setLogoutLoading(true);
    setError('');

    try {
      // Step 1: Client-side sign out to clear the session
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;

      // Step 2: Call the API to clear server-side cookies
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        const text = await response.text(); // Get raw response to debug
        console.error('Logout API response:', text);
        throw new Error(`Logout API failed with status ${response.status}: ${text}`);
      }

      const result = await response.json();

      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error.message);
      setError('Logout failed: ' + error.message);
      toast({
        title: 'Logout Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setUpdateLoading(true);
    setFormError('');

    if (!formData.phone_number) {
      setFormError('Phone number is required for payouts.');
      setUpdateLoading(false);
      return;
    }

    if (!formData.phone_number.match(/^\+?[0-9]+$/)) {
      setFormError('Phone number must contain only digits, optionally starting with a + (e.g., +254712345678)');
      setUpdateLoading(false);
      return;
    }

    try {
      const updates = {
        name: formData.name || null,
        gender: formData.gender || null,
        phone_number: formData.phone_number,
        preferred_routes: formData.preferred_routes.split(',').map(route => route.trim()).filter(route => route),
        location: formData.location || null,
        updated_at: new Date().toISOString(),
      };
      console.log('Updating profile with:', updates);
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Update profile error:', error);
        throw error;
      }

      setUserData({
        ...userData,
        ...updates,
        preferred_routes: updates.preferred_routes,
      });
      setEditMode(false);
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile: ' + err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);

    try {
      const { data: userProfile, error: userFetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      if (userFetchError) throw new Error(`Failed to fetch user profile: ${userFetchError.message}`);

      console.log('User profile to archive:', userProfile);

      console.log('Attempting to delete user from auth.users:', user.id);
      const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error('Failed to delete user from auth.users:', result.error);
        if (result.error.includes('User not found')) {
          console.warn('User not found in auth.users, proceeding as if deleted.');
        } else {
          throw new Error(result.error || 'Failed to delete auth user');
        }
      } else {
        console.log('Delete user API response:', result);
      }

      const deletedUserData = {
        id: userProfile.id,
        email: userProfile.email,
        user_type: userProfile.user_type,
        name: userProfile.name || null,
        gender: userProfile.gender || null,
        phone_number: userProfile.phone_number || null,
        preferred_routes: userProfile.preferred_routes || null,
        location: userProfile.location || null,
        gigs_completed: userProfile.gigs_completed || 0,
        impressions: userProfile.impressions || 0,
        analytics: userProfile.analytics || null,
        verified: userProfile.verified || false,
        rating: userProfile.rating || 0,
        ratings_count: userProfile.ratings_count || 0,
        created_at: userProfile.created_at || new Date().toISOString(),
        deleted_at: new Date().toISOString(),
      };

      const { error: archiveError } = await supabase
        .from('deleted_users')
        .insert(deletedUserData);
      if (archiveError) throw new Error(`Failed to archive user data: ${archiveError.message}`);

      const { data: userGigs, error: gigsFetchError } = await supabase
        .from('gigs')
        .select('id, campaign_id, trips_assigned, status')
        .eq('freelancer_id', user.id);
      if (gigsFetchError) throw new Error(`Failed to fetch gigs: ${gigsFetchError.message}`);

      for (const gig of userGigs) {
        if (gig.status !== 'completed') {
          const { data: campaign, error: campaignFetchError } = await supabase
            .from('campaigns')
            .select('trips_remaining')
            .eq('id', gig.campaign_id)
            .single();
          if (campaignFetchError) throw new Error(`Failed to fetch campaign ${gig.campaign_id}: ${campaignFetchError.message}`);

          if (!campaign) {
            console.warn(`Campaign ${gig.campaign_id} not found for gig ${gig.id}. Skipping trips restoration.`);
            continue;
          }

          const newTripsRemaining = Math.max(0, (campaign.trips_remaining || 0) + (gig.trips_assigned || 0));

          const { error: campaignUpdateError } = await supabase
            .from('campaigns')
            .update({ trips_remaining: newTripsRemaining, updated_at: new Date().toISOString() })
            .eq('id', gig.campaign_id);
          if (campaignUpdateError) throw new Error(`Failed to update campaign ${gig.campaign_id}: ${campaignUpdateError.message}`);

          const { error: deleteGigError } = await supabase
            .from('gigs')
            .delete()
            .eq('id', gig.id);
          if (deleteGigError) throw new Error(`Failed to delete gig ${gig.id}: ${deleteGigError.message}`);
        }
      }

      const nonCompletedGigIds = userGigs
        .filter(gig => gig.status !== 'completed')
        .map(gig => gig.id);
      if (nonCompletedGigIds.length > 0) {
        const { error: videosError } = await supabase
          .from('gigs')
          .delete()
          .in('gig_id', nonCompletedGigIds);
        if (videosError) throw new Error(`Failed to delete videos: ${videosError.message}`);
      }

      console.log('Attempting to delete user from users table:', user.id);
      const { data: deletedUser, error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)
        .select();
      if (userError) throw new Error(`Failed to delete user from users table: ${userError.message}`);
      console.log('Deleted user from users table:', deletedUser);

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.warn('Sign out failed:', signOutError.message);
      }

      toast({
        title: 'Account Deleted',
        description: 'Your account has been successfully deleted.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      router.push('/');
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(`Failed to delete account: ${err.message}. Please try again or contact support.`);
    } finally {
      setDeleteLoading(false);
      onDeleteModalClose();
    }
  };

  const calculateRankingScore = () => {
    if (!userData) return 0;
    const completedGigs = stats.completedGigs;
    const rating = stats.rating;
    const impressions = stats.impressions;
    return (completedGigs * 0.4) + (rating * 0.3) + (impressions * 0.3);
  };

  const calculateProfileCompleteness = () => {
    if (!userData) return 0;
    let score = 0;
    if (userData.name) score += 20;
    if (userData.gender) score += 20;
    if (userData.phone_number) score += 20;
    if (userData.preferred_routes && userData.preferred_routes.length > 0) score += 20;
    if (userData.location) score += 20;
    return score;
  };

  if (loading) {
    return (
      <Box p={8} display="flex" justifyContent="center" alignItems="center" height="50vh">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={8}>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
        <Button mt={4} onClick={() => router.push('/')}>Back to Login</Button>
      </Box>
    );
  }

  if (!user || !userData) {
    return (
      <Box p={8}>
        <Alert status="warning">
          <AlertIcon />
          <AlertTitle>Access denied or user data not found.</AlertTitle>
        </Alert>
        <Button mt={4} onClick={() => router.push('/')}>Back to Login</Button>
      </Box>
    );
  }

  if (userData.user_type !== 'freelancer') {
    return (
      <Box p={8}>
        <Alert status="warning">
          <AlertIcon />
          <AlertTitle>You don’t have access to this section.</AlertTitle>
        </Alert>
        <Button mt={4} onClick={() => router.push('/')}>Back to Home</Button>
      </Box>
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
          <Heading size={["lg", "xl", "2xl"]} bgGradient="linear(to-r, purple.500, blue.500)" bgClip="text">
            Freelancer Profile
          </Heading>
          <Text color="gray.600" mt={2} fontSize={["md", "lg"]}>Manage your account and view performance</Text>
        </Box>
        <HStack spacing={[2, 4]} mt={[4, 0]}>
  <Button
    onClick={() => router.push('/freelancer/gigs')}
    colorScheme="blue"
    variant="ghost"
    size="sm"
    leftIcon={<Icon as={FaBriefcase} />}
  >
    Gigs
  </Button>
  <Button
    onClick={() => router.push('/freelancer/earnings')} // Changed from window.location.href
    colorScheme="blue"
    variant="ghost"
    size="sm"
    leftIcon={<Icon as={FaMoneyBillWave} />}
  >
    Earnings
  </Button>
  <Button
    onClick={() => router.push('/freelancer/upload')} // Fixed typo
    colorScheme="blue"
    variant="ghost"
    size="sm"
    leftIcon={<Icon as={FaVideo} />}
  >
    Upload
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
      <MenuItem onClick={() => setEditMode(true)}>
        <Icon as={FaEdit} mr={2} />
        Edit Profile
      </MenuItem>
      <MenuItem onClick={onDeleteModalOpen} color="red.500">
        <Icon as={FaTrash} mr={2} />
        Delete Account
      </MenuItem>
      <MenuDivider />
      <MenuItem onClick={handleLogout} color="red.500" isDisabled={logoutLoading}>
        <Icon as={FaSignOutAlt} mr={2} />
        {logoutLoading ? 'Logging out...' : 'Logout'}
      </MenuItem>
    </MenuList>
  </Menu>
</HStack>
      </Box>

      {/* Profile Stats Grid */}
      <SimpleGrid columns={[1, 2, 3]} spacing={[4, 6, 8]} mb={[6, 8, 10]}>
        <Box
          onClick={() => router.push('/freelancer/earnings')}
          cursor="pointer"
          _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
          transition="all 0.2s"
        >
          <StatCard
            title="Total Earnings"
            value={`KES ${stats.totalEarnings.toLocaleString()}`}
            icon={FaMoneyBillWave}
            colorScheme="green"
            description="Lifetime earnings"
          />
        </Box>
        <StatCard
          title="Total Impressions"
          value={stats.impressions.toLocaleString()}
          icon={FaChartBar}
          colorScheme="blue"
          description="Total audience reached"
        />
        <StatCard
          title="Completed Gigs"
          value={stats.completedGigs}
          icon={FaCheckCircle}
          colorScheme="purple"
          description="Successfully completed"
        />
      </SimpleGrid>

      {/* Performance Analytics Section */}
      <Box bg="white" p={[4, 6]} borderRadius="xl" boxShadow="sm" mb={[6, 8, 10]}>
        <Heading size={["md", "lg"]} mb={[4, 6]} color="gray.700">Performance Analytics</Heading>
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList mb={4}>
            <Tab>Earnings Trend</Tab>
            <Tab>Impressions</Tab>
            <Tab>Audience Demographics</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Box height={["300px", "400px"]}>
                <Line 
                  data={{
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                      label: 'Monthly Earnings',
                      data: [
                        stats.totalEarnings * 0.15,
                        stats.totalEarnings * 0.20,
                        stats.totalEarnings * 0.25,
                        stats.totalEarnings * 0.15,
                        stats.totalEarnings * 0.15,
                        stats.totalEarnings * 0.10
                      ],
                      borderColor: 'rgb(75, 192, 192)',
                      tension: 0.1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                      title: {
                        display: true,
                        text: 'Monthly Earnings Trend'
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `KES ${context.raw.toLocaleString()}`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return 'KES ' + value.toLocaleString();
                          }
                        }
                      }
                    }
                  }}
                />
              </Box>
            </TabPanel>
            <TabPanel>
              <Box height={["300px", "400px"]}>
                <Bar 
                  data={{
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                      label: 'Monthly Impressions',
                      data: [
                        stats.impressions * 0.15,
                        stats.impressions * 0.20,
                        stats.impressions * 0.25,
                        stats.impressions * 0.15,
                        stats.impressions * 0.15,
                        stats.impressions * 0.10
                      ],
                      backgroundColor: 'rgba(53, 162, 235, 0.5)',
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                      title: {
                        display: true,
                        text: 'Monthly Impressions'
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return context.raw.toLocaleString() + ' impressions';
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return value.toLocaleString();
                          }
                        }
                      }
                    }
                  }}
                />
              </Box>
            </TabPanel>
            <TabPanel>
              <Box height={["300px", "400px"]}>
                <Doughnut 
                  data={{
                    labels: ['Male', 'Female', 'Mixed'],
                    datasets: [{
                      data: [
                        Math.round(stats.impressions * 0.45),
                        Math.round(stats.impressions * 0.35),
                        Math.round(stats.impressions * 0.20)
                      ],
                      backgroundColor: [
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(255, 206, 86, 0.5)'
                      ],
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                      title: {
                        display: true,
                        text: 'Audience Demographics'
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${value.toLocaleString()} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Achievement Badges */}
      <Box bg="white" p={[4, 6]} borderRadius="xl" boxShadow="sm" mb={[6, 8, 10]}>
        <Heading size={["md", "lg"]} mb={[4, 6]} color="gray.700">Achievements</Heading>
        <SimpleGrid columns={[2, 3, 4]} spacing={[4, 6]}>
          <Box textAlign="center" p={4} borderRadius="lg" bg="blue.50">
            <Icon as={FaStar} w={8} h={8} color="yellow.400" mb={2} />
            <Text fontWeight="bold" color="blue.600">Top Performer</Text>
            <Text fontSize="sm" color="gray.600">Consistently high ratings</Text>
          </Box>
          <Box textAlign="center" p={4} borderRadius="lg" bg="green.50">
            <Icon as={FaCheckCircle} w={8} h={8} color="green.400" mb={2} />
            <Text fontWeight="bold" color="green.600">Reliable Partner</Text>
            <Text fontSize="sm" color="gray.600">On-time deliveries</Text>
          </Box>
          <Box textAlign="center" p={4} borderRadius="lg" bg="purple.50">
            <Icon as={FaChartLine} w={8} h={8} color="purple.400" mb={2} />
            <Text fontWeight="bold" color="purple.600">Growth Champion</Text>
            <Text fontSize="sm" color="gray.600">Increasing performance</Text>
          </Box>
          <Box textAlign="center" p={4} borderRadius="lg" bg="orange.50">
            <Icon as={FaUserTie} w={8} h={8} color="orange.400" mb={2} />
            <Text fontWeight="bold" color="orange.600">Professional</Text>
            <Text fontSize="sm" color="gray.600">High-quality content</Text>
          </Box>
        </SimpleGrid>
      </Box>

      {/* Profile Information */}
      <Box bg="white" p={[4, 6]} borderRadius="xl" boxShadow="sm" mb={[6, 8, 10]}>
        <HStack justify="space-between" mb={[4, 6]}>
          <Heading size={["md", "lg"]} color="gray.700">Profile Information</Heading>
          {!editMode ? (
            <Button
              leftIcon={<Icon as={FaEdit} />}
              colorScheme="blue"
              size="sm"
              onClick={() => setEditMode(true)}
            >
              Edit Profile
            </Button>
          ) : (
            <HStack>
              <Button
                leftIcon={<Icon as={FaSave} />}
                colorScheme="green"
                size="sm"
                onClick={handleUpdateProfile}
                isLoading={updateLoading}
              >
                Save Changes
              </Button>
              <Button
                leftIcon={<Icon as={FaTimesCircle} />}
                colorScheme="red"
                size="sm"
                onClick={() => setEditMode(false)}
              >
                Cancel
              </Button>
            </HStack>
          )}
        </HStack>

        <SimpleGrid columns={[1, 2]} spacing={[4, 6]}>
          <FormControl>
            <FormLabel>Name</FormLabel>
            {editMode ? (
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your name"
              />
            ) : (
              <Text>{userData.name || 'Not set'}</Text>
            )}
          </FormControl>

          <FormControl>
            <FormLabel>Gender</FormLabel>
            {editMode ? (
              <Select
                value={formData.gender}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            ) : (
              <Text>{userData.gender || 'Not set'}</Text>
            )}
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Phone Number</FormLabel>
            {editMode ? (
              <Input
                value={formData.phone_number}
                onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                placeholder="+254712345678"
              />
            ) : (
              <Text>{userData.phone_number || 'Not set'}</Text>
            )}
          </FormControl>

          <FormControl>
            <FormLabel>Location</FormLabel>
            {editMode ? (
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Your location"
              />
            ) : (
              <Text>{userData.location || 'Not set'}</Text>
            )}
          </FormControl>

          <FormControl gridColumn={["1 / -1", "1 / -1"]}>
            <FormLabel>Preferred Routes</FormLabel>
            {editMode ? (
              <Input
                value={formData.preferred_routes}
                onChange={(e) => setFormData(prev => ({ ...prev, preferred_routes: e.target.value }))}
                placeholder="Enter preferred routes (comma-separated)"
              />
            ) : (
              <Text>{Array.isArray(userData.preferred_routes) ? userData.preferred_routes.join(', ') : userData.preferred_routes || 'Not set'}</Text>
            )}
          </FormControl>
        </SimpleGrid>

        {formError && (
          <Alert status="error" mt={4}>
            <AlertIcon />
            <AlertTitle>{formError}</AlertTitle>
          </Alert>
        )}
      </Box>

      {/* Performance Metrics */}
      <Box bg="white" p={[4, 6]} borderRadius="xl" boxShadow="sm" mb={[6, 8, 10]}>
        <Heading size={["md", "lg"]} mb={[4, 6]} color="gray.700">Performance Metrics</Heading>
        <SimpleGrid columns={[1, 2]} spacing={[4, 6]}>
          <Box>
            <Text fontSize="sm" color="gray.600" mb={2}>Profile Completeness</Text>
            <Progress value={calculateProfileCompleteness()} colorScheme="blue" size="sm" borderRadius="full" />
            <Text fontSize="sm" color="gray.500" mt={1}>{calculateProfileCompleteness()}% Complete</Text>
          </Box>
          <Box>
            <Text fontSize="sm" color="gray.600" mb={2}>Ranking Score</Text>
            <Progress value={calculateRankingScore() * 20} colorScheme="green" size="sm" borderRadius="full" />
            <Text fontSize="sm" color="gray.500" mt={1}>Score: {calculateRankingScore().toFixed(1)}</Text>
          </Box>
        </SimpleGrid>
      </Box>

      {/* Delete Account Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Account</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Are you sure you want to delete your account? This action cannot be undone.</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleDeleteAccount}
              isLoading={deleteLoading}
            >
              Delete Account
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
