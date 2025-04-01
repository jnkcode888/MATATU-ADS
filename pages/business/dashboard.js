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
import { supabase } from '../../lib/supabase';
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

export default function BusinessDashboard({ user: initialUser, userData: initialUserData }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [userData, setUserData] = useState(initialUserData);
  const [loading, setLoading] = useState(true);
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
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session) {
          router.replace('/');
          return;
        }

        const authUser = session.user;
        setUser(authUser);

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            router.replace('/complete-registration');
          } else {
            throw profileError;
          }
          return;
        }

        if (profile.user_type !== 'business') {
          router.replace('/');
          return;
        }

        setUserData(profile);
        setLoading(false);
      } catch (error) {
        console.error('Session check error:', error);
        toast({
          title: 'Error',
          description: 'Failed to validate session: ' + error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        router.replace('/');
      }
    };

    if (!initialUser || !initialUserData) {
      checkSession();
    } else if (initialUserData.user_type !== 'business') {
      router.replace('/');
    } else {
      setLoading(false);
    }
  }, [initialUser, initialUserData, router, toast]);

  useEffect(() => {
    const { data: { subscription }, error } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (event === 'SIGNED_OUT') {
        router.push('/');
      }
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
  }, [router, toast]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      try {
        const { data: campaigns, error: campaignsError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('business_id', user.id)
          .eq('status', 'active');

        if (campaignsError) throw campaignsError;

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
        toast({
          title: 'Error',
          description: 'Failed to fetch dashboard stats: ' + error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    if (!loading && user) {
      fetchStats();
    }
  }, [user, loading, toast]);

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
        phone_number: userProfile.phone || null,
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

      const { data: userCampaigns, error: campaignsFetchError } = await supabase
        .from('campaigns')
        .select('id, status')
        .eq('business_id', user.id);
      if (campaignsFetchError) throw new Error(`Failed to fetch campaigns: ${campaignsFetchError.message}`);

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
        description: 'Your account has been deleted. Your historical data remains linked to your old account ID.',
        status: 'success',
        duration: 7000,
        isClosable: true,
      });

      window.location.href = '/';
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

  if (loading) {
    return (
      <Container maxW="container.xl" p={5}>
        <Box p={8} textAlign="center">
          <Text>Loading your dashboard...</Text>
        </Box>
      </Container>
    );
  }

  if (!user || !userData || userData.user_type !== 'business') {
    return (
      <Container maxW="container.xl" p={5}>
        <Box p={8} textAlign="center">
          <Text>Authentication required or access denied. Redirecting to login...</Text>
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
        bg={bgColor}
        p={[4, 6]}
        borderRadius="xl"
        boxShadow="sm"
        borderWidth="1px"
        borderColor={borderColor}
      >
        <Box>
          <Heading size={["lg", "xl", "2xl"]} bgGradient="linear(to-r, blue.500, teal.500)" bgClip="text">
            Business Dashboard
          </Heading>
          <Text color="gray.600" mt={2} fontSize={["md", "lg"]}>
            Welcome back, {userData.name || user.email}
          </Text>
        </Box>
        <HStack 
  spacing={[1, 2, 4]} 
  mt={[2, 4]}
  overflowX="auto"
  w="100%"
  flexWrap="nowrap"
>
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
      <MenuItem onClick={() => router.push('/business/chat')}>
        <Icon as={FaInbox} mr={2} />
        Chat
      </MenuItem>
      <MenuItem onClick={() => router.push('/business/settings')}>
        <Icon as={FaCog} mr={2} />
        Settings
      </MenuItem>
      <MenuItem onClick={onOpenDeleteModal} color="red.500">
        <Icon as={FaTrash} mr={2} />
        Delete Account
      </MenuItem>
      <MenuDivider />
      <MenuItem onClick={handleLogout} color="red.500">
        <Icon as={FaSignOutAlt} mr={2} />
        Logout
      </MenuItem>
    </MenuList>
  </Menu>
</HStack>
      </Box>

      <SimpleGrid columns={[1, 2, 3, 4]} spacing={6} mb={8}>
        <Card bg={bgColor} borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
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

        <Card bg={bgColor} borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
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

        <Card bg={bgColor} borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
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

        <Card bg={bgColor} borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
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

      <Card mb={8} bg={bgColor} borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
        <CardBody>
          <VStack spacing={6} align="stretch">
            <Box>
              <Heading size="md" mb={4}>Quick Actions</Heading>
              <SimpleGrid columns={[1, 2]} spacing={4}>
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
                <Button
                  colorScheme="purple"
                  size="lg"
                  height="100px"
                  onClick={() => router.push('/business/payments')}
                  leftIcon={<Icon as={FaMoneyBillWave} w={6} h={6} />}
                  variant="outline"
                  _hover={{ bg: hoverBg }}
                  transition="all 0.2s"
                >
                  <VStack spacing={2}>
                    <Text>Make Payment</Text>
                    <Text fontSize="sm" color="gray.500">Fund your campaigns</Text>
                  </VStack>
                </Button>
              </SimpleGrid>
            </Box>
          </VStack>
        </CardBody>
      </Card>

      <Card bg={bgColor} borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
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
                    borderColor={borderColor}
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

      <Modal isOpen={isDeleteModalOpen} onClose={onCloseDeleteModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Account</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Are you sure you want to delete your account? This action is permanent and cannot be undone.</Text>
            <Text mt={2}>Your historical data will remain linked to your old account ID.</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onCloseDeleteModal} mr={3}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleDeleteAccount}
              isLoading={deleteLoading}
              isDisabled={deleteLoading}
            >
              Delete Account
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}