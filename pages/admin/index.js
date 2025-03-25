// pages/admin/index.js
import { 
  Box, Heading, Text, Button, VStack, Spinner, Center, Tabs, TabList, Tab, TabPanels, TabPanel, 
  Grid, GridItem, Select, Input, FormControl, FormLabel, Badge, useToast, Stat, StatLabel, StatNumber,
  StatHelpText, StatArrow, Icon, HStack, Divider, Progress, Avatar, Menu, MenuButton, MenuList,
  MenuItem, MenuDivider, useColorModeValue, Card, CardBody, SimpleGrid, useDisclosure
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { 
  FaVideo, FaMoneyBillWave, FaInbox, FaChartLine, FaUser, FaCog, FaSignOutAlt,
  FaTrash, FaBell, FaSearch, FaCalendarAlt, FaUsers, FaChartBar, FaFileAlt,
  FaQuestionCircle, FaHome, FaCheck, FaTimes, FaExclamationTriangle, FaFilter,
  FaSort, FaRefresh, FaDownload, FaUpload, FaUserShield
} from 'react-icons/fa';

const fetchUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        user_type,
        name,
        phone_number,
        preferred_routes,
        gender,
        location,
        gigs_completed,
        impressions,
        analytics,
        rating,
        created_at,
        updated_at
      `)
      .eq('user_type', 'freelancer');
    if (error) throw error;

    const rankedUsers = (data || []).map(user => {
      const { gigs_completed = 0, impressions = 0, analytics = {}, rating = 0 } = user;
      const engagementScore = Object.values(analytics?.engagement_levels || {}).reduce((sum, count) => {
        return sum + (count * (analytics.engagement_levels[count] === 'high' ? 3 : analytics.engagement_levels[count] === 'medium' ? 2 : 1));
      }, 0);
      const rankingScore = Math.round(
        (gigs_completed * 15) + 
        (impressions * 0.2) + 
        (engagementScore * 5) + 
        (rating * 10)
      );

      let normalizedPreferredRoutes = [];
      if (Array.isArray(user.preferred_routes)) {
        normalizedPreferredRoutes = user.preferred_routes;
      } else if (typeof user.preferred_routes === 'string') {
        normalizedPreferredRoutes = user.preferred_routes.split(',').map(route => route.trim());
      }

      return { 
        ...user, 
        preferred_routes: normalizedPreferredRoutes, 
        rankingScore 
      };
    }).sort((a, b) => b.rankingScore - a.rankingScore);

    return rankedUsers;
  } catch (error) {
    console.error('Unexpected error fetching users:', error.message);
    return [];
  }
};

const fetchCampaigns = async () => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        id,
        business_id,
        product_name,
        script,
        route,
        budget,
        price_per_trip,
        trips_needed,
        trips_remaining,
        status,
        deadline,
        created_at,
        updated_at
      `);
    if (error) throw error;

    const analyticsPromises = (data || []).map(async (campaign) => {
      const { data: gigs, error: gigsError } = await supabase
        .from('gigs')
        .select('id, freelancer_payout_per_trip, status, freelancer_id')
        .eq('campaign_id', campaign.id);
      if (gigsError) throw gigsError;

      if (!gigs || gigs.length === 0) {
        return {
          [campaign.id]: {
            totalImpressions: 0,
            totalVideos: 0,
            avgEngagement: 'N/A',
            avgFreelancerPayoutPerTrip: 'N/A',
            freelancersAssigned: 0,
            completedGigs: 0,
            ageGroupDistribution: {},
            genderDistribution: {}
          }
        };
      }

      const gigIds = gigs.map(gig => gig.id);
      const freelancersAssigned = new Set(gigs.map(gig => gig.freelancer_id)).size;
      const completedGigs = gigs.filter(gig => gig.status === 'verified' || gig.status === 'paid').length;
      const avgFreelancerPayoutPerTrip = gigs.length > 0
        ? (gigs.reduce((sum, gig) => sum + (gig.freelancer_payout_per_trip || 500), 0) / gigs.length).toFixed(2)
        : 'N/A';

      const { data: videos, error: videosError } = await supabase
        .from('gig_videos')
        .select('analytics')
        .in('gig_id', gigIds);
      if (videosError) throw videosError;

      const analytics = videos.reduce((acc, video) => ({
        totalImpressions: acc.totalImpressions + (video.analytics?.impressions || 0),
        totalVideos: acc.totalVideos + 1,
        engagementLevels: [...acc.engagementLevels, video.analytics?.engagement_level || 'unknown'],
        ageGroups: [...acc.ageGroups, video.analytics?.audience_age_group || 'unknown'],
        genders: [...acc.genders, video.analytics?.audience_gender || 'unknown']
      }), { totalImpressions: 0, totalVideos: 0, engagementLevels: [], ageGroups: [], genders: [] });

      const avgEngagement = analytics.engagementLevels.length > 0
        ? (analytics.engagementLevels.reduce((sum, level) => sum + (level === 'high' ? 3 : level === 'medium' ? 2 : level === 'low' ? 1 : 0), 0) / analytics.engagementLevels.length).toFixed(1)
        : 'N/A';

      const ageGroupDistribution = analytics.ageGroups.reduce((acc, group) => ({
        ...acc,
        [group]: (acc[group] || 0) + 1
      }), {});
      const genderDistribution = analytics.genders.reduce((acc, gender) => ({
        ...acc,
        [gender]: (acc[gender] || 0) + 1
      }), {});

      return {
        [campaign.id]: {
          totalImpressions: analytics.totalImpressions,
          totalVideos: analytics.totalVideos,
          avgEngagement,
          avgFreelancerPayoutPerTrip,
          freelancersAssigned,
          completedGigs,
          ageGroupDistribution,
          genderDistribution
        }
      };
    });

    const analyticsResults = await Promise.all(analyticsPromises);
    const analyticsMap = analyticsResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});

    return (data || []).map(campaign => ({
      ...campaign,
      analytics: analyticsMap[campaign.id] || {
        totalImpressions: 0,
        totalVideos: 0,
        avgEngagement: 'N/A',
        avgFreelancerPayoutPerTrip: 'N/A',
        freelancersAssigned: 0,
        completedGigs: 0,
        ageGroupDistribution: {},
        genderDistribution: {}
      }
    }));
  } catch (error) {
    console.error('Unexpected error fetching campaigns:', error.message);
    return [];
  }
};

const fetchNewCampaigns = async () => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        id,
        business_id,
        product_name,
        script,
        route,
        budget,
        price_per_trip,
        trips_needed,
        trips_remaining,
        status,
        deadline,
        created_at,
        updated_at,
        users (
          id,
          email,
          name,
          phone_number
        )
      `)
      .eq('status', 'pending');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching new campaigns:', error.message);
    return [];
  }
};

const fetchGigs = async () => {
  try {
    const { data: gigsData, error: gigsError } = await supabase
      .from('gigs')
      .select(`
        id,
        campaign_id,
        freelancer_id,
        video_url,
        status,
        accepted_at,
        route_id,
        tracking_started_at,
        tracking_ended_at,
        rate,
        created_at,
        updated_at,
        completed_at,
        assigned_at,
        submitted_at,
        trips_assigned,
        deadline,
        freelancer_payout_per_trip
      `);
    if (gigsError) throw gigsError;

    if (!gigsData || gigsData.length === 0) return [];

    const campaignIds = [...new Set(gigsData.map(gig => gig.campaign_id).filter(id => id))];
    const freelancerIds = [...new Set(gigsData.map(gig => gig.freelancer_id).filter(id => id))];
    const routeIds = [...new Set(gigsData.map(gig => gig.route_id).filter(id => id))];

    const { data: campaignsData, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, product_name, price_per_trip, deadline')
      .in('id', campaignIds);
    if (campaignsError) throw campaignsError;

    const { data: freelancersData, error: freelancersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        phone_number,
        location,
        gigs_completed,
        rating
      `)
      .in('id', freelancerIds);
    if (freelancersError) throw freelancersError;

    const { data: routesData, error: routesError } = await supabase
      .from('routes')
      .select('id, name')
      .in('id', routeIds);
    if (routesError) throw routesError;

    return gigsData.map(gig => {
      const tripsAssigned = Number(gig.trips_assigned) || 0;
      const payoutPerTrip = Number(gig.freelancer_payout_per_trip) || 500;
      return {
        ...gig,
        campaigns: campaignsData?.find(c => c.id === gig.campaign_id) || { product_name: `Campaign #${gig.campaign_id}`, price_per_trip: 1000, deadline: null },
        freelancers: freelancersData?.find(f => f.id === gig.freelancer_id) || { email: `User #${gig.freelancer_id}`, phone_number: null, name: null, location: null, gigs_completed: 0, rating: 0 },
        routes: routesData?.find(r => r.id === gig.route_id) || { name: `Route #${gig.route_id}` },
        earnings: tripsAssigned * payoutPerTrip
      };
    });
  } catch (error) {
    console.error('Unexpected error fetching gigs:', error.message);
    return [];
  }
};

const fetchMessages = async () => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        business_id,
        content,
        timestamp
      `)
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching messages:', error.message);
    return [];
  }
};

export default function AdminDashboard({ user, userData }) {
  const router = useRouter();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [newCampaigns, setNewCampaigns] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFreelancer, setSelectedFreelancer] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [freelancerPayoutPerTrip, setFreelancerPayoutPerTrip] = useState({});
  const [pricePerTrip, setPricePerTrip] = useState({});
  const { isOpen: isDeleteModalOpen, onOpen: onOpenDeleteModal, onClose: onCloseDeleteModal } = useDisclosure();

  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const scrollbarTrack = useColorModeValue('gray.100', 'gray.700');
  const scrollbarThumb = useColorModeValue('gray.300', 'gray.600');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setError(null);
        if (!user) {
          if (router.pathname !== '/') router.replace('/');
          return;
        }
        if (!userData || userData.user_type !== 'admin') {
          if (userData?.user_type === 'freelancer') {
            if (router.pathname !== '/freelancer/profile') router.replace('/freelancer/profile');
          } else if (userData?.user_type === 'business') {
            if (router.pathname !== '/business/dashboard') router.replace('/business/dashboard');
          } else {
            if (router.pathname !== '/') router.replace('/');
          }
          return;
        }

        setLoading(true);
        const [usersData, campaignsData, newCampaignsData, gigsData, messagesData] = await Promise.all([
          fetchUsers().catch(err => {
            console.error('Error fetching users:', err);
            toast({
              title: 'Error fetching users',
              description: err.message,
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
            return [];
          }),
          fetchCampaigns().catch(err => {
            console.error('Error fetching campaigns:', err);
            toast({
              title: 'Error fetching campaigns',
              description: err.message,
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
            return [];
          }),
          fetchNewCampaigns().catch(err => {
            console.error('Error fetching new campaigns:', err);
            toast({
              title: 'Error fetching new campaigns',
              description: err.message,
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
            return [];
          }),
          fetchGigs().catch(err => {
            console.error('Error fetching gigs:', err);
            toast({
              title: 'Error fetching gigs',
              description: err.message,
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
            return [];
          }),
          fetchMessages().catch(err => {
            console.error('Error fetching messages:', err);
            toast({
              title: 'Error fetching messages',
              description: err.message,
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
            return [];
          })
        ]);

        console.log('Fetched data:', {
          users: usersData.length,
          campaigns: campaignsData.length,
          newCampaigns: newCampaignsData.length,
          gigs: gigsData.length,
          messages: messagesData.length
        });

        setUsers(usersData);
        setCampaigns(campaignsData);
        setNewCampaigns(newCampaignsData);
        setGigs(gigsData);
        setMessages(messagesData);
      } catch (error) {
        console.error('Error in checkAuth:', error);
        setError(error.message);
        if (router.pathname !== '/') router.replace('/');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [user, userData, router]);

  const refreshMessages = async () => {
    const messagesData = await fetchMessages();
    setMessages(messagesData);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleAssignGig = async (freelancerId, campaignId, setLoading) => {
    setLoading(true);
    try {
      const selectedCampaign = campaigns.find(c => c.id === campaignId);
      if (!selectedCampaign) throw new Error('Campaign not found');
      if (selectedCampaign.trips_remaining <= 0) throw new Error('No trips remaining for this campaign');

      const { data: newGig, error: insertError } = await supabase
        .from('gigs')
        .insert({
          freelancer_id: freelancerId,
          campaign_id: campaignId,
          status: 'pending',
          trips_assigned: 1,
          freelancer_payout_per_trip: 500,
          deadline: selectedCampaign.deadline,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          assigned_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          trips_remaining: selectedCampaign.trips_remaining - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (updateError) throw updateError;

      const updatedGigs = await fetchGigs();
      const updatedCampaigns = await fetchCampaigns();
      setGigs(updatedGigs);
      setCampaigns(updatedCampaigns);
      toast({
        title: 'Success',
        description: 'Gig assigned successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error assigning gig:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign gig: ' + error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyGig = async (gigId, newStatus, setLoading) => {
    setLoading(true);
    try {
      const gig = gigs.find(g => g.id === gigId);
      if (!gig) throw new Error('Gig not found');

      const { error: updateError } = await supabase
        .from('gigs')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', gigId);
      if (updateError) throw updateError;

      if (newStatus === 'verified') {
        const { error: incrementError } = await supabase
          .from('users')
          .update({
            gigs_completed: (gig.freelancers.gigs_completed || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', gig.freelancer_id);

        if (incrementError) throw incrementError;

        const { data: videos, error: videosError } = await supabase
          .from('gig_videos')
          .select('analytics')
          .eq('gig_id', gigId);
        if (videosError) throw videosError;

        const totalImpressions = videos.reduce((sum, video) => sum + (video.analytics?.impressions || 0), 0);

        const { data: freelancerData, error: fetchError } = await supabase
          .from('users')
          .select('impressions, analytics')
          .eq('id', gig.freelancer_id)
          .single();
        if (fetchError) throw fetchError;

        const updatedAnalytics = {
          ...freelancerData.analytics,
          impressions: (freelancerData.analytics?.impressions || 0) + totalImpressions,
        };

        const { error: updateStatsError } = await supabase
          .from('users')
          .update({
            impressions: (freelancerData.impressions || 0) + totalImpressions,
            analytics: updatedAnalytics,
            updated_at: new Date().toISOString()
          })
          .eq('id', gig.freelancer_id);
        if (updateStatsError) throw updateStatsError;
      }

      const updatedGigs = await fetchGigs();
      setGigs(updatedGigs);
      toast({
        title: 'Success',
        description: `Gig ${newStatus} successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error verifying gig:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify gig: ' + error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCampaign = async (campaignId, setLoading) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('campaigns')
        .update({ status: 'active' })
        .eq('id', campaignId);
      if (error) throw error;
      toast({
        title: 'Campaign approved',
        description: 'The campaign has been approved and is now active.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      const [campaignsData, newCampaignsData] = await Promise.all([
        fetchCampaigns(),
        fetchNewCampaigns()
      ]);
      setCampaigns(campaignsData);
      setNewCampaigns(newCampaignsData);
    } catch (error) {
      console.error('Error approving campaign:', error);
      toast({
        title: 'Error approving campaign',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePricePerTrip = async (campaignId) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ price_per_trip: pricePerTrip[campaignId] })
        .eq('id', campaignId);
      if (error) throw error;
      toast({
        title: 'Price updated',
        description: 'The price per trip has been updated successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      const campaignsData = await fetchCampaigns();
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('Error updating price:', error);
      toast({
        title: 'Error updating price',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const updateFreelancerPayoutPerTrip = async (gigId) => {
    try {
      const newPayout = Number(freelancerPayoutPerTrip[gigId]);
      if (isNaN(newPayout) || newPayout <= 0) throw new Error('Freelancer payout per trip must be a positive number');

      const gig = gigs.find(g => g.id === gigId);
      if (!gig) throw new Error('Gig not found');

      const campaignPricePerTrip = gig.campaigns?.price_per_trip || 1000;
      if (newPayout > campaignPricePerTrip) throw new Error('Freelancer payout cannot exceed the campaign price per trip (KSh ' + campaignPricePerTrip + ')');

      const { error } = await supabase
        .from('gigs')
        .update({
          freelancer_payout_per_trip: newPayout,
          updated_at: new Date().toISOString()
        })
        .eq('id', gigId);

      if (error) throw error;

      const updatedGigs = await fetchGigs();
      setGigs(updatedGigs);
      toast({
        title: 'Success',
        description: 'Freelancer payout per trip updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating freelancer payout per trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to update freelancer payout per trip: ' + error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const getCampaignStatus = (campaignId) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return { status: 'Unknown', colorScheme: 'gray' };
    
    switch (campaign.status) {
      case 'active':
        return { status: 'Active', colorScheme: 'green' };
      case 'pending':
        return { status: 'Pending', colorScheme: 'yellow' };
      case 'rejected':
        return { status: 'Rejected', colorScheme: 'red' };
      case 'completed':
        return { status: 'Completed', colorScheme: 'blue' };
      default:
        return { status: 'Unknown', colorScheme: 'gray' };
    }
  };

  const isCampaignExpired = (deadline) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (!user || !userData) return null;

  return (
    <Box p={8} bg={bgColor} minH="100vh">
      {/* Header Section */}
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={8}
        bg={cardBgColor}
        p={6}
        borderRadius="xl"
        boxShadow="sm"
        borderWidth="1px"
        borderColor={borderColor}
      >
        <Box>
          <Heading size="xl" bgGradient="linear(to-r, purple.500, blue.500)" bgClip="text">
            Admin Dashboard
          </Heading>
          <Text color="gray.600" mt={2}>Welcome, {user.email}</Text>
        </Box>
        <HStack spacing={4}>
          <Menu>
            <MenuButton
              as={Button}
              variant="ghost"
              size="sm"
              leftIcon={<Icon as={FaBell} />}
            >
              <Badge colorScheme="red" position="absolute" top={2} right={2}>
                3
              </Badge>
              Notifications
            </MenuButton>
            <MenuList>
              <MenuItem>New campaign assigned</MenuItem>
              <MenuItem>Payment received</MenuItem>
              <MenuItem>Support ticket updated</MenuItem>
            </MenuList>
          </Menu>
          <Link href="/" passHref>
            <Button colorScheme="gray" leftIcon={<Icon as={FaHome} />}>
              Back to Home
            </Button>
          </Link>
          <Link href="/admin/diagnostics" passHref>
            <Button colorScheme="purple" leftIcon={<Icon as={FaChartLine} />}>
              Diagnostics
            </Button>
          </Link>
          <Menu>
            <MenuButton
              as={Button}
              variant="ghost"
              size="sm"
              leftIcon={<Icon as={FaUserShield} />}
            >
              Admin
            </MenuButton>
            <MenuList>
              <MenuItem icon={<FaCog />}>Settings</MenuItem>
              <MenuItem icon={<FaUser />}>Profile</MenuItem>
              <MenuDivider />
              <MenuItem icon={<FaSignOutAlt />} onClick={handleLogout}>
                Logout
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Box>

      {/* Quick Stats */}
      <SimpleGrid columns={[1, 2, 3, 4]} spacing={6} mb={8}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel display="flex" alignItems="center">
                <Icon as={FaUsers} mr={2} color="blue.500" />
                Total Users
              </StatLabel>
              <StatNumber color="blue.600">{users.length}</StatNumber>
              <StatHelpText>Active freelancers</StatHelpText>
              <StatArrow type="increase" />
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel display="flex" alignItems="center">
                <Icon as={FaVideo} mr={2} color="green.500" />
                Active Campaigns
              </StatLabel>
              <StatNumber color="green.600">{campaigns.filter(c => c.status === 'active').length}</StatNumber>
              <StatHelpText>Currently running</StatHelpText>
              <StatArrow type="increase" />
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel display="flex" alignItems="center">
                <Icon as={FaChartBar} mr={2} color="purple.500" />
                Pending Verifications
              </StatLabel>
              <StatNumber color="purple.600">{gigs.filter(g => g.status === 'submitted').length}</StatNumber>
              <StatHelpText>Awaiting review</StatHelpText>
              <StatArrow type="increase" />
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel display="flex" alignItems="center">
                <Icon as={FaMoneyBillWave} mr={2} color="orange.500" />
                Total Revenue
              </StatLabel>
              <StatNumber color="orange.600">KSh {gigs.reduce((sum, gig) => sum + (gig.earnings || 0), 0).toLocaleString()}</StatNumber>
              <StatHelpText>This month</StatHelpText>
              <StatArrow type="increase" />
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Main Content */}
      <Tabs variant="enclosed" colorScheme="purple" mb={8}>
        <TabList mb={4} overflowX="auto" css={{
          '&::-webkit-scrollbar': {
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: scrollbarTrack,
          },
          '&::-webkit-scrollbar-thumb': {
            background: scrollbarThumb,
            borderRadius: '4px',
          },
        }}>
          <Tab>Users</Tab>
          <Tab>Assign Jobs</Tab>
          <Tab>Verify Jobs</Tab>
          <Tab>Verified Gigs</Tab>
          <Tab>Messages</Tab>
          <Tab>Campaigns & Gigs</Tab>
          <Tab>Manage Campaigns</Tab>
          <Tab>New Campaigns</Tab>
          <Tab>Analytics</Tab>
        </TabList>

        <TabPanels>
          {/* Users Panel */}
          <TabPanel>
            <Card>
              <CardBody>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Heading size="md" mb={4}>User Management</Heading>
                    <SimpleGrid columns={[1, 2, 3]} spacing={6}>
                      {users.map((u) => (
                        <Card key={u.id} variant="outline">
                          <CardBody>
                            <VStack align="stretch" spacing={3}>
                              <HStack justify="space-between">
                                <Text fontWeight="bold">{u.name || u.email}</Text>
                                <Badge colorScheme="green">{u.rankingScore}</Badge>
                              </HStack>
                              <Divider />
                              <Box>
                                <Text fontSize="sm" color="gray.500">User Type</Text>
                                <Text>{u.user_type}</Text>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.500">Contact</Text>
                                <Text>Phone: {u.phone_number || 'N/A'}</Text>
                                <Text>Email: {u.email}</Text>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.500">Location</Text>
                                <Text>{u.location || 'N/A'}</Text>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.500">Performance</Text>
                                <HStack spacing={4}>
                                  <Stat size="sm">
                                    <StatLabel>Gigs</StatLabel>
                                    <StatNumber>{u.gigs_completed || 0}</StatNumber>
                                  </Stat>
                                  <Stat size="sm">
                                    <StatLabel>Impressions</StatLabel>
                                    <StatNumber>{u.impressions || 0}</StatNumber>
                                  </Stat>
                                  <Stat size="sm">
                                    <StatLabel>Rating</StatLabel>
                                    <StatNumber>{u.rating || 0}</StatNumber>
                                  </Stat>
                                </HStack>
                              </Box>
                            </VStack>
                          </CardBody>
                        </Card>
                      ))}
                    </SimpleGrid>
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </TabPanel>

          {/* Assign Jobs Panel */}
          <TabPanel>
            <Card>
              <CardBody>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Heading size="md" mb={4}>Assign Jobs to Freelancers</Heading>
                    <SimpleGrid columns={[1, 2]} spacing={6}>
                      <Card>
                        <CardBody>
                          <FormControl mb={4}>
                            <FormLabel>Select Campaign</FormLabel>
                            <Select
                              placeholder="Select campaign"
                              value={selectedCampaign}
                              onChange={(e) => setSelectedCampaign(e.target.value)}
                            >
                              {campaigns.map((campaign) => (
                                <option key={campaign.id} value={campaign.id}>
                                  {campaign.product_name || `Campaign #${campaign.id}`} (Trips Remaining: {campaign.trips_remaining})
                                </option>
                              ))}
                            </Select>
                          </FormControl>
                        </CardBody>
                      </Card>
                      <Card>
                        <CardBody>
                          <FormControl mb={4}>
                            <FormLabel>Select Freelancer (Ranked by Performance)</FormLabel>
                            <Select
                              placeholder="Select freelancer"
                              value={selectedFreelancer}
                              onChange={(e) => setSelectedFreelancer(e.target.value)}
                            >
                              {users
                                .filter((user) => user.user_type === 'freelancer')
                                .map((freelancer) => (
                                  <option key={freelancer.id} value={freelancer.id}>
                                    {freelancer.name || freelancer.email} (Ranking: {freelancer.rankingScore})
                                  </option>
                                ))}
                            </Select>
                          </FormControl>
                        </CardBody>
                      </Card>
                    </SimpleGrid>
                    <Button
                      colorScheme="blue"
                      mt={4}
                      onClick={() => handleAssignGig(selectedFreelancer, selectedCampaign, setLoading)}
                      isLoading={loading}
                      isDisabled={!selectedFreelancer || !selectedCampaign}
                      leftIcon={<Icon as={FaVideo} />}
                    >
                      Assign Job
                    </Button>
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </TabPanel>

          {/* Verify Jobs Panel */}
          <TabPanel>
            <Card>
              <CardBody>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Heading size="md" mb={4}>Verify Submitted Jobs</Heading>
                    <SimpleGrid columns={[1, 2]} spacing={6}>
                      {gigs
                        .filter((gig) => gig.status === 'submitted')
                        .map((gig) => (
                          <Card key={gig.id} variant="outline">
                            <CardBody>
                              <VStack align="stretch" spacing={3}>
                                <HStack justify="space-between">
                                  <Text fontWeight="bold">
                                    {gig.campaigns?.product_name || `Campaign #${gig.campaign_id}`}
                                  </Text>
                                  <Badge colorScheme="yellow">Submitted</Badge>
                                </HStack>
                                <Divider />
                                <Box>
                                  <Text fontSize="sm" color="gray.500">Freelancer</Text>
                                  <Text>{gig.freelancers?.name || gig.freelancers?.email || `User #${gig.freelancer_id}`}</Text>
                                </Box>
                                <Box>
                                  <Text fontSize="sm" color="gray.500">Performance</Text>
                                  <HStack spacing={4}>
                                    <Stat size="sm">
                                      <StatLabel>Location</StatLabel>
                                      <StatNumber>{gig.freelancers?.location || 'N/A'}</StatNumber>
                                    </Stat>
                                    <Stat size="sm">
                                      <StatLabel>Completed</StatLabel>
                                      <StatNumber>{gig.freelancers?.gigs_completed || 0}</StatNumber>
                                    </Stat>
                                    <Stat size="sm">
                                      <StatLabel>Rating</StatLabel>
                                      <StatNumber>{gig.freelancers?.rating || 0}</StatNumber>
                                    </Stat>
                                  </HStack>
                                </Box>
                                <Box>
                                  <Text fontSize="sm" color="gray.500">Gig Details</Text>
                                  <Text>Trips Assigned: {gig.trips_assigned}</Text>
                                  <Text>Payout per Trip: KSh {gig.freelancer_payout_per_trip || 500}</Text>
                                  <Text>Total Earnings: KSh {gig.earnings.toLocaleString()}</Text>
                                </Box>
                                <FormControl>
                                  <FormLabel>Update Payout per Trip (KSh)</FormLabel>
                                  <HStack>
                                    <Input
                                      type="number"
                                      value={freelancerPayoutPerTrip[gig.id] || gig.freelancer_payout_per_trip || 500}
                                      onChange={(e) => setFreelancerPayoutPerTrip({
                                        ...freelancerPayoutPerTrip,
                                        [gig.id]: e.target.value
                                      })}
                                      placeholder="Enter new payout"
                                    />
                                    <Button
                                      colorScheme="blue"
                                      onClick={() => updateFreelancerPayoutPerTrip(gig.id)}
                                    >
                                      Update
                                    </Button>
                                  </HStack>
                                </FormControl>
                                <HStack spacing={2}>
                                  <Button
                                    colorScheme="green"
                                    leftIcon={<Icon as={FaCheck} />}
                                    onClick={() => handleVerifyGig(gig.id, 'verified', setLoading)}
                                  >
                                    Verify
                                  </Button>
                                  <Button
                                    colorScheme="red"
                                    leftIcon={<Icon as={FaTimes} />}
                                    onClick={() => handleVerifyGig(gig.id, 'rejected', setLoading)}
                                  >
                                    Reject
                                  </Button>
                                </HStack>
                              </VStack>
                            </CardBody>
                          </Card>
                        ))}
                    </SimpleGrid>
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </TabPanel>

          {/* Verified Gigs Panel */}
          <TabPanel>
            <Card>
              <CardBody>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Heading size="md" mb={4}>Verified Gigs</Heading>
                    {loading ? (
                      <Center p={8}>
                        <Spinner size="xl" />
                      </Center>
                    ) : error ? (
                      <Center p={8}>
                        <Text color="red.500">{error}</Text>
                      </Center>
                    ) : gigs.filter((gig) => gig.status === 'verified').length === 0 ? (
                      <Center p={8}>
                        <Text>No verified gigs found</Text>
                      </Center>
                    ) : (
                      <SimpleGrid columns={[1, 2]} spacing={6}>
                        {gigs
                          .filter((gig) => gig.status === 'verified')
                          .map((gig) => (
                            <Card key={gig.id} variant="outline">
                              <CardBody>
                                <VStack align="stretch" spacing={3}>
                                  <HStack justify="space-between">
                                    <Text fontWeight="bold">
                                      {gig.campaigns?.product_name || `Campaign #${gig.campaign_id}`}
                                    </Text>
                                    <Badge colorScheme="green">Verified</Badge>
                                  </HStack>
                                  <Divider />
                                  <Box>
                                    <Text fontSize="sm" color="gray.500">Freelancer</Text>
                                    <Text>{gig.freelancers?.name || gig.freelancers?.email || `User #${gig.freelancer_id}`}</Text>
                                  </Box>
                                  <Box>
                                    <Text fontSize="sm" color="gray.500">Performance</Text>
                                    <HStack spacing={4}>
                                      <Stat size="sm">
                                        <StatLabel>Location</StatLabel>
                                        <StatNumber>{gig.freelancers?.location || 'N/A'}</StatNumber>
                                      </Stat>
                                      <Stat size="sm">
                                        <StatLabel>Completed</StatLabel>
                                        <StatNumber>{gig.freelancers?.gigs_completed || 0}</StatNumber>
                                      </Stat>
                                      <Stat size="sm">
                                        <StatLabel>Rating</StatLabel>
                                        <StatNumber>{gig.freelancers?.rating || 0}</StatNumber>
                                      </Stat>
                                    </HStack>
                                  </Box>
                                  <Box>
                                    <Text fontSize="sm" color="gray.500">Gig Details</Text>
                                    <Text>Trips Assigned: {gig.trips_assigned}</Text>
                                    <Text>Payout per Trip: KSh {gig.freelancer_payout_per_trip || 500}</Text>
                                    <Text>Total Earnings: KSh {gig.earnings.toLocaleString()}</Text>
                                  </Box>
                                  <Button
                                    colorScheme="teal"
                                    leftIcon={<Icon as={FaMoneyBillWave} />}
                                    onClick={() => handleVerifyGig(gig.id, 'paid', setLoading)}
                                  >
                                    Mark as Paid
                                  </Button>
                                </VStack>
                              </CardBody>
                            </Card>
                          ))}
                      </SimpleGrid>
                    )}
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </TabPanel>

          {/* Messages Panel */}
          <TabPanel>
            <Card>
              <CardBody>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Heading size="md" mb={4}>Messages</Heading>
                    <Button
                      colorScheme="blue"
                      leftIcon={<Icon as={FaRefresh} />}
                      onClick={refreshMessages}
                      mb={4}
                      isLoading={loading}
                    >
                      Refresh Messages
                    </Button>
                    {loading ? (
                      <Center p={8}>
                        <Spinner size="xl" />
                      </Center>
                    ) : error ? (
                      <Center p={8}>
                        <Text color="red.500">{error}</Text>
                      </Center>
                    ) : messages.length === 0 ? (
                      <Center p={8}>
                        <Text>No messages found</Text>
                      </Center>
                    ) : (
                      <SimpleGrid columns={[1]} spacing={4}>
                        {messages.map((message) => (
                          <Card key={message.id} variant="outline">
                            <CardBody>
                              <VStack align="stretch" spacing={2}>
                                <HStack justify="space-between">
                                  <Text fontWeight="bold">Message from Business</Text>
                                  <Text fontSize="sm" color="gray.500">
                                    {new Date(message.timestamp).toLocaleString()}
                                  </Text>
                                </HStack>
                                <Text>{message.content}</Text>
                              </VStack>
                            </CardBody>
                          </Card>
                        ))}
                      </SimpleGrid>
                    )}
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </TabPanel>

          {/* Campaigns & Gigs Panel */}
          <TabPanel>
            <Card>
              <CardBody>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Heading size="md" mb={4}>Campaigns & Gigs Overview</Heading>
                    {loading ? (
                      <Center p={8}>
                        <Spinner size="xl" />
                      </Center>
                    ) : error ? (
                      <Center p={8}>
                        <Text color="red.500">{error}</Text>
                      </Center>
                    ) : campaigns.length === 0 ? (
                      <Center p={8}>
                        <Text>No campaigns found</Text>
                      </Center>
                    ) : (
                      <SimpleGrid columns={[1, 2]} spacing={6}>
                        {campaigns.map((campaign) => (
                          <Card key={campaign.id} variant="outline">
                            <CardBody>
                              <VStack align="stretch" spacing={3}>
                                <HStack justify="space-between">
                                  <Text fontWeight="bold">{campaign.product_name}</Text>
                                  <Badge colorScheme={getCampaignStatus(campaign.id).colorScheme}>
                                    {getCampaignStatus(campaign.id).status}
                                  </Badge>
                                </HStack>
                                <Divider />
                                <Box>
                                  <Text fontSize="sm" color="gray.500">Campaign Details</Text>
                                  <Text>Route: {campaign.route}</Text>
                                  <Text>Budget: KSh {campaign.budget.toLocaleString()}</Text>
                                  <Text>Price per Trip: KSh {campaign.price_per_trip}</Text>
                                  <Text>Trips Needed: {campaign.trips_needed}</Text>
                                  <Text>Trips Remaining: {campaign.trips_remaining}</Text>
                                  <Text>Deadline: {new Date(campaign.deadline).toLocaleDateString()}</Text>
                                </Box>
                                <Box>
                                  <Text fontSize="sm" color="gray.500">Analytics</Text>
                                  <HStack spacing={4}>
                                    <Stat size="sm">
                                      <StatLabel>Impressions</StatLabel>
                                      <StatNumber>{campaign.analytics?.totalImpressions || 0}</StatNumber>
                                    </Stat>
                                    <Stat size="sm">
                                      <StatLabel>Videos</StatLabel>
                                      <StatNumber>{campaign.analytics?.totalVideos || 0}</StatNumber>
                                    </Stat>
                                    <Stat size="sm">
                                      <StatLabel>Engagement</StatLabel>
                                      <StatNumber>{campaign.analytics?.avgEngagement || 'N/A'}</StatNumber>
                                    </Stat>
                                  </HStack>
                                </Box>
                              </VStack>
                            </CardBody>
                          </Card>
                        ))}
                      </SimpleGrid>
                    )}
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </TabPanel>

          {/* Manage Campaigns Panel */}
          <TabPanel>
            <Card>
              <CardBody>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Heading size="md" mb={4}>Manage Campaigns</Heading>
                    {loading ? (
                      <Center p={8}>
                        <Spinner size="xl" />
                      </Center>
                    ) : error ? (
                      <Center p={8}>
                        <Text color="red.500">{error}</Text>
                      </Center>
                    ) : campaigns.length === 0 ? (
                      <Center p={8}>
                        <Text>No campaigns found</Text>
                      </Center>
                    ) : (
                      <SimpleGrid columns={[1, 2]} spacing={6}>
                        {campaigns.map((campaign) => (
                          <Card key={campaign.id} variant="outline">
                            <CardBody>
                              <VStack align="stretch" spacing={3}>
                                <HStack justify="space-between">
                                  <Text fontWeight="bold">{campaign.product_name}</Text>
                                  <Badge colorScheme={getCampaignStatus(campaign.id).colorScheme}>
                                    {getCampaignStatus(campaign.id).status}
                                  </Badge>
                                </HStack>
                                <Divider />
                                <Box>
                                  <Text fontSize="sm" color="gray.500">Campaign Details</Text>
                                  <Text>Route: {campaign.route}</Text>
                                  <Text>Budget: KSh {campaign.budget.toLocaleString()}</Text>
                                  <Text>Trips Needed: {campaign.trips_needed}</Text>
                                  <Text>Trips Remaining: {campaign.trips_remaining}</Text>
                                  <Text>Deadline: {new Date(campaign.deadline).toLocaleDateString()}</Text>
                                </Box>
                                <FormControl>
                                  <FormLabel>Price per Trip (KSh)</FormLabel>
                                  <HStack>
                                    <Input
                                      type="number"
                                      value={pricePerTrip[campaign.id] || campaign.price_per_trip}
                                      onChange={(e) => setPricePerTrip({
                                        ...pricePerTrip,
                                        [campaign.id]: e.target.value
                                      })}
                                      placeholder="Enter new price"
                                    />
                                    <Button
                                      colorScheme="blue"
                                      onClick={() => updatePricePerTrip(campaign.id)}
                                    >
                                      Update
                                    </Button>
                                  </HStack>
                                </FormControl>
                                <Button
                                  colorScheme="red"
                                  leftIcon={<Icon as={FaTimes} />}
                                  onClick={() => handleVerifyGig(campaign.id, 'rejected', setLoading)}
                                  isDisabled={campaign.status === 'rejected'}
                                >
                                  Reject Campaign
                                </Button>
                              </VStack>
                            </CardBody>
                          </Card>
                        ))}
                      </SimpleGrid>
                    )}
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </TabPanel>

          {/* New Campaigns Panel */}
          <TabPanel>
            <Card>
              <CardBody>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Heading size="md" mb={4}>New Campaigns</Heading>
                    {loading ? (
                      <Center p={8}>
                        <Spinner size="xl" />
                      </Center>
                    ) : error ? (
                      <Center p={8}>
                        <Text color="red.500">{error}</Text>
                      </Center>
                    ) : newCampaigns.length === 0 ? (
                      <Center p={8}>
                        <Text>No new campaigns found</Text>
                      </Center>
                    ) : (
                      <SimpleGrid columns={[1, 2]} spacing={6}>
                        {newCampaigns.map((campaign) => (
                          <Card key={campaign.id} variant="outline">
                            <CardBody>
                              <VStack align="stretch" spacing={3}>
                                <HStack justify="space-between">
                                  <Text fontWeight="bold">{campaign.product_name}</Text>
                                  <Badge colorScheme="yellow">Pending</Badge>
                                </HStack>
                                <Divider />
                                <Box>
                                  <Text fontSize="sm" color="gray.500">Campaign Details</Text>
                                  <Text>Route: {campaign.route}</Text>
                                  <Text>Budget: KSh {campaign.budget.toLocaleString()}</Text>
                                  <Text>Price per Trip: KSh {campaign.price_per_trip}</Text>
                                  <Text>Trips Needed: {campaign.trips_needed}</Text>
                                  <Text>Deadline: {new Date(campaign.deadline).toLocaleDateString()}</Text>
                                </Box>
                                <Box>
                                  <Text fontSize="sm" color="gray.500">Business Details</Text>
                                  <Text>Name: {campaign.users?.name || 'N/A'}</Text>
                                  <Text>Email: {campaign.users?.email || 'N/A'}</Text>
                                  <Text>Phone: {campaign.users?.phone_number || 'N/A'}</Text>
                                </Box>
                                <Button
                                  colorScheme="green"
                                  leftIcon={<Icon as={FaCheck} />}
                                  onClick={() => handleApproveCampaign(campaign.id, setLoading)}
                                >
                                  Approve Campaign
                                </Button>
                              </VStack>
                            </CardBody>
                          </Card>
                        ))}
                      </SimpleGrid>
                    )}
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </TabPanel>

          {/* Analytics Panel */}
          <TabPanel>
            <Card>
              <CardBody>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Heading size="md" mb={4}>Analytics Overview</Heading>
                    {loading ? (
                      <Center p={8}>
                        <Spinner size="xl" />
                      </Center>
                    ) : error ? (
                      <Center p={8}>
                        <Text color="red.500">{error}</Text>
                      </Center>
                    ) : (
                      <SimpleGrid columns={[1, 2, 3]} spacing={6}>
                        <Card>
                          <CardBody>
                            <Stat>
                              <StatLabel>Total Users</StatLabel>
                              <StatNumber>{users.length}</StatNumber>
                              <StatHelpText>Active freelancers</StatHelpText>
                            </Stat>
                          </CardBody>
                        </Card>
                        <Card>
                          <CardBody>
                            <Stat>
                              <StatLabel>Active Campaigns</StatLabel>
                              <StatNumber>{campaigns.filter(c => c.status === 'active').length}</StatNumber>
                              <StatHelpText>Currently running</StatHelpText>
                            </Stat>
                          </CardBody>
                        </Card>
                        <Card>
                          <CardBody>
                            <Stat>
                              <StatLabel>Total Gigs</StatLabel>
                              <StatNumber>{gigs.length}</StatNumber>
                              <StatHelpText>All time</StatHelpText>
                            </Stat>
                          </CardBody>
                        </Card>
                        <Card>
                          <CardBody>
                            <Stat>
                              <StatLabel>Verified Gigs</StatLabel>
                              <StatNumber>{gigs.filter(g => g.status === 'verified').length}</StatNumber>
                              <StatHelpText>Successfully completed</StatHelpText>
                            </Stat>
                          </CardBody>
                        </Card>
                        <Card>
                          <CardBody>
                            <Stat>
                              <StatLabel>Total Revenue</StatLabel>
                              <StatNumber>KSh {gigs.reduce((sum, gig) => sum + (gig.earnings || 0), 0).toLocaleString()}</StatNumber>
                              <StatHelpText>All time</StatHelpText>
                            </Stat>
                          </CardBody>
                        </Card>
                        <Card>
                          <CardBody>
                            <Stat>
                              <StatLabel>Pending Verifications</StatLabel>
                              <StatNumber>{gigs.filter(g => g.status === 'submitted').length}</StatNumber>
                              <StatHelpText>Awaiting review</StatHelpText>
                            </Stat>
                          </CardBody>
                        </Card>
                      </SimpleGrid>
                    )}
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}