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
  Card,
  CardBody,
  VStack,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Icon,
  HStack,
  Divider,
  Badge,
  Progress,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useColorModeValue,
} from '@chakra-ui/react';
import { supabase } from '../../lib/supabase'; // Import supabase directly
import { useRouter } from 'next/router';
import { 
  FaVideo, 
  FaMoneyBillWave, 
  FaInbox, 
  FaChartLine,
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaTrash,
  FaBell,
  FaSearch,
  FaCalendarAlt,
  FaUsers,
  FaChartBar,
  FaFileAlt,
  FaQuestionCircle,
  FaUpload,
  FaChevronDown
} from 'react-icons/fa';

export default function BusinessDashboard({ user: initialUser, userData }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    totalImpressions: 0,
    totalSpent: 0,
    engagementRate: 0
  });
  const toast = useToast();
  const { isOpen: isDeleteModalOpen, onOpen: onOpenDeleteModal, onClose: onCloseDeleteModal } = useDisclosure();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

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
    const fetchStats = async () => {
      if (!user) return;
      
      try {
        // Fetch active campaigns
        const { data: campaigns, error: campaignsError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('business_id', user.id)
          .eq('status', 'active');

        if (campaignsError) throw campaignsError;

        // Fetch total impressions and spent
        const { data: gigs, error: gigsError } = await supabase
          .from('gigs')
          .select('*')
          .in('campaign_id', campaigns.map(c => c.id));

        if (gigsError) throw gigsError;

        const totalImpressions = gigs.reduce((sum, gig) => sum + (gig.impressions || 0), 0);
        const totalSpent = gigs.reduce((sum, gig) => sum + (gig.total_spent || 0), 0);
        const engagementRate = totalImpressions > 0 
          ? (gigs.filter(g => g.status === 'completed').length / totalImpressions) * 100 
          : 0;

        setStats({
          activeCampaigns: campaigns.length,
          totalImpressions,
          totalSpent,
          engagementRate
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [user]);

  const handleLogout = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);

    try {
      // Step 1: Fetch the user's current profile data from the users table
      const { data: userProfile, error: userFetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      if (userFetchError) throw new Error(`Failed to fetch user profile: ${userFetchError.message}`);

      console.log('User profile to archive:', userProfile);

      // Step 2: Delete the user from auth.users (via server-side API) *first*
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

      // Step 3: Insert the user's data into deleted_users with dynamic field mapping
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

      // Step 4: Fetch campaigns created by the business user
      const { data: userCampaigns, error: campaignsFetchError } = await supabase
        .from('campaigns')
        .select('id, status')
        .eq('business_id', user.id);
      if (campaignsFetchError) throw new Error(`Failed to fetch campaigns: ${campaignsFetchError.message}`);

      // Step 5: Handle campaigns and associated gigs
      for (const campaign of userCampaigns) {
        const { data: gigs, error: gigsFetchError } = await supabase
          .from('gigs')
          .select('id, status')
          .eq('campaign_id', campaign.id);
        if (gigsFetchError) throw new Error(`Failed to fetch gigs for campaign ${campaign.id}: ${gigsFetchError.message}`);

        const nonCompletedGigIds = gigs
          .filter(gig => gig.status !== 'completed')
          .map(gig => gig.id);

        if (nonCompletedGigIds.length > 0) {
          const { error: videosError } = await supabase
            .from('videos')
            .delete()
            .in('gig_id', nonCompletedGigIds);
          if (videosError) throw new Error(`Failed to delete videos for campaign ${campaign.id}: ${videosError.message}`);

          const { error: deleteGigsError } = await supabase
            .from('gigs')
            .delete()
            .in('id', nonCompletedGigIds);
          if (deleteGigsError) throw new Error(`Failed to delete gigs for campaign ${campaign.id}: ${deleteGigsError.message}`);
        }

        const { error: deleteCampaignError } = await supabase
          .from('campaigns')
          .delete()
          .eq('id', campaign.id);
        if (deleteCampaignError) throw new Error(`Failed to delete campaign ${campaign.id}: ${deleteCampaignError.message}`);
      }

      // Step 6: Delete user profile from public.users
      console.log('Attempting to delete user from users table:', user.id);
      const { data: deletedUser, error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)
        .select();
      if (userError) throw new Error(`Failed to delete user from users table: ${userError.message}`);
      console.log('Deleted user from users table:', deletedUser);

      // Step 7: Sign out the user (optional, since auth.users is already deleted)
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.warn('Sign out failed:', signOutError.message);
      }

      toast({
        title: 'Account Deleted',
        description: 'Your account has been deleted. Your historical data remains linked to your old account ID. You may create a new account with the same email.',
        status: 'success',
        duration: 7000,
        isClosable: true,
      });

      window.location.href = '/'; // Hard redirect
    } catch (err) {
      console.error('Error deleting account:', err);
      toast({
        title: 'Delete Account Failed',
        description: `Failed to delete account: ${err.message}. Please try again or contact support.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setDeleteLoading(false);
      onCloseDeleteModal();
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
            Business Dashboard
          </Heading>
          <Text color="gray.600" mt={2} fontSize={["md", "lg"]}>Welcome back, {user.email}</Text>
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
              <MenuItem onClick={handleLogout} color="red.500">
                <Icon as={FaSignOutAlt} mr={2} />
                Logout
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Box>

      {/* Stats Overview */}
      <SimpleGrid columns={[1, 2, 3, 4]} spacing={6} mb={8}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel display="flex" alignItems="center">
                <Icon as={FaVideo} mr={2} color="blue.500" />
                Active Campaigns
              </StatLabel>
              <StatNumber color="blue.600">{stats.activeCampaigns}</StatNumber>
              <StatHelpText>Currently running</StatHelpText>
              <StatArrow type="increase" />
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel display="flex" alignItems="center">
                <Icon as={FaUsers} mr={2} color="green.500" />
                Total Impressions
              </StatLabel>
              <StatNumber color="green.600">{stats.totalImpressions.toLocaleString()}</StatNumber>
              <StatHelpText>Across all campaigns</StatHelpText>
              <StatArrow type="increase" />
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel display="flex" alignItems="center">
                <Icon as={FaMoneyBillWave} mr={2} color="purple.500" />
                Total Spent
              </StatLabel>
              <StatNumber color="purple.600">KSh {stats.totalSpent.toLocaleString()}</StatNumber>
              <StatHelpText>This month</StatHelpText>
              <StatArrow type="increase" />
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel display="flex" alignItems="center">
                <Icon as={FaChartBar} mr={2} color="orange.500" />
                Engagement Rate
              </StatLabel>
              <StatNumber color="orange.600">{stats.engagementRate.toFixed(1)}%</StatNumber>
              <StatHelpText>Average across campaigns</StatHelpText>
              <StatArrow type="increase" />
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Quick Actions */}
      <Card mb={8} bg="white" borderRadius="xl" boxShadow="sm">
        <CardBody>
          <VStack spacing={6} align="stretch">
            <Box>
              <Heading size="md" mb={4}>Quick Actions</Heading>
              <SimpleGrid columns={[1]} spacing={4}>
                <Button
                  colorScheme="blue"
                  size="lg"
                  height="100px"
                  onClick={() => router.push('/business/campaigns')}
                  leftIcon={<Icon as={FaVideo} w={6} h={6} />}
                  variant="outline"
                  _hover={{ bg: hoverBg }}
                  transition="all 0.2s"
                >
                  <VStack spacing={2}>
                    <Text>Manage Campaigns</Text>
                    <Text fontSize="sm" color="gray.500">Create and monitor campaigns</Text>
                  </VStack>
                </Button>
              </SimpleGrid>
            </Box>
          </VStack>
        </CardBody>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardBody>
          <VStack spacing={6} align="stretch">
            <Box>
              <Heading size="md" mb={4}>Recent Activity</Heading>
              <VStack spacing={4} align="stretch">
                {[1, 2, 3].map((item) => (
                  <Box
                    key={item}
                    p={4}
                    borderWidth="1px"
                    borderRadius="lg"
                    _hover={{ bg: hoverBg }}
                    transition="all 0.2s"
                  >
                    <HStack justify="space-between">
                      <HStack>
                        <Icon as={FaCalendarAlt} color="blue.500" />
                        <Box>
                          <Text fontWeight="medium">Campaign #{item} Updated</Text>
                          <Text fontSize="sm" color="gray.500">2 hours ago</Text>
                        </Box>
                      </HStack>
                      <Badge colorScheme="blue">New</Badge>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            </Box>
          </VStack>
        </CardBody>
      </Card>

      {/* Delete Account Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={onCloseDeleteModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Account</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Are you sure you want to delete your account? This action is permanent and cannot be undone.</Text>
            <Text mt={2}>Your historical data will remain linked to your old account ID, but you will be able to create a new account with the same email.</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onCloseDeleteModal} mr={3}>
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