// pages/freelancer/earnings.js
import { 
  Box, Container, Heading, Text, VStack, HStack, SimpleGrid,
  Stat, StatLabel, StatNumber, StatHelpText, StatArrow,
  Icon, Button, useToast, Menu, MenuButton, MenuList, MenuItem,
  MenuDivider, useDisclosure, Table, Thead, Tbody, Tr, Th, Td,
  Badge, Progress, useColorModeValue, Card, CardBody, CardHeader,
  CardFooter, Divider, Spinner, Alert, AlertIcon, AlertTitle
} from '@chakra-ui/react';
import { FaUser, FaExclamationCircle, FaCheckCircle, FaChartLine, FaStar, FaRoute, FaVideo, FaMoneyBillWave, FaMapMarkerAlt, FaPhone, FaEnvelope, FaTimesCircle, FaExclamationTriangle, FaTrash, FaEdit, FaSave, FaUserTie, FaCalendarAlt, FaUpload, FaBriefcase, FaChartBar, FaSignOutAlt, FaChevronDown } from 'react-icons/fa';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
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

export default function Earnings() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [earnings, setEarnings] = useState([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingEarnings: 0,
    completedEarnings: 0,
    averageEarningsPerTrip: 0
  });

  const toast = useToast();

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
        
        // Fetch earnings data
        const { data: gigsData, error: gigsError } = await supabase
          .from('gigs')
          .select('*, campaigns(*)')
          .eq('freelancer_id', authUser.id)
          .order('created_at', { ascending: false });

        if (gigsError) throw gigsError;

        // Calculate earnings
        const earningsData = gigsData.map(gig => ({
          id: gig.id,
          campaignName: gig.campaigns?.product_name || `Campaign #${gig.id}`,
          date: new Date(gig.created_at).toLocaleDateString(),
          tripsCompleted: gig.trips_assigned,
          earningsPerTrip: gig.freelancer_payout_per_trip,
          totalEarnings: gig.freelancer_payout_per_trip * gig.trips_assigned,
          status: gig.status
        }));

        setEarnings(earningsData);

        // Calculate stats
        const totalEarnings = earningsData.reduce((sum, gig) => sum + gig.totalEarnings, 0);
        const pendingEarnings = earningsData
          .filter(gig => gig.status === 'assigned')
          .reduce((sum, gig) => sum + gig.totalEarnings, 0);
        const completedEarnings = earningsData
          .filter(gig => gig.status === 'completed')
          .reduce((sum, gig) => sum + gig.totalEarnings, 0);
        const completedTrips = earningsData
          .filter(gig => gig.status === 'completed')
          .reduce((sum, gig) => sum + gig.tripsCompleted, 0);

        setStats({
          totalEarnings,
          pendingEarnings,
          completedEarnings,
          averageEarningsPerTrip: completedTrips > 0 ? completedEarnings / completedTrips : 0
        });

        setLoading(false);
      } catch (err) {
        console.error('Error in initialize:', err);
        setError('Failed to load earnings: ' + err.message);
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/');
    } catch (error) {
      console.error('Logout failed:', error.message);
      setError('Logout failed: ' + error.message);
    }
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
            Earnings Dashboard
          </Heading>
          <Text color="gray.600" mt={2} fontSize={["md", "lg"]}>Track your earnings and performance</Text>
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

      {/* Earnings Stats Grid */}
      <SimpleGrid columns={[1, 2, 4]} spacing={[4, 6, 8]} mb={[6, 8, 10]}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel fontSize={["md", "lg"]} color="gray.600">Total Earnings</StatLabel>
              <StatNumber fontSize={["xl", "2xl"]} color="green.500">
                KES {stats.totalEarnings.toLocaleString()}
              </StatNumber>
              <StatHelpText fontSize={["sm", "md"]} color="gray.500">
                Lifetime earnings
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel fontSize={["md", "lg"]} color="gray.600">Pending Earnings</StatLabel>
              <StatNumber fontSize={["xl", "2xl"]} color="orange.500">
                KES {stats.pendingEarnings.toLocaleString()}
              </StatNumber>
              <StatHelpText fontSize={["sm", "md"]} color="gray.500">
                Awaiting completion
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel fontSize={["md", "lg"]} color="gray.600">Completed Earnings</StatLabel>
              <StatNumber fontSize={["xl", "2xl"]} color="blue.500">
                KES {stats.completedEarnings.toLocaleString()}
              </StatNumber>
              <StatHelpText fontSize={["sm", "md"]} color="gray.500">
                Successfully earned
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel fontSize={["md", "lg"]} color="gray.600">Avg. Earnings/Trip</StatLabel>
              <StatNumber fontSize={["xl", "2xl"]} color="purple.500">
                KES {stats.averageEarningsPerTrip.toLocaleString()}
              </StatNumber>
              <StatHelpText fontSize={["sm", "md"]} color="gray.500">
                Per completed trip
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Assigned Gigs Section */}
      <Card mb={[6, 8, 10]}>
        <CardHeader>
          <Heading size={["md", "lg"]} color="gray.700">Assigned Gigs</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={[1, 2, 3]} spacing={[4, 6, 8]}>
            {earnings
              .filter(gig => gig.status === 'assigned')
              .map((gig) => (
                <Card key={gig.id} variant="outline" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <Box>
                        <HStack justify="space-between" mb={2}>
                          <Heading size="sm" color="blue.600">{gig.campaignName}</Heading>
                          <Badge colorScheme="orange" fontSize="xs">Pending</Badge>
                        </HStack>
                        <Text color="gray.600" fontSize="sm">Assigned on {gig.date}</Text>
                      </Box>

                      <Divider />

                      <SimpleGrid columns={2} spacing={4}>
                        <Box>
                          <Text color="gray.500" fontSize="sm">Trips Assigned</Text>
                          <Text fontWeight="bold" fontSize="lg">{gig.tripsCompleted}</Text>
                        </Box>
                        <Box>
                          <Text color="gray.500" fontSize="sm">Rate per Trip</Text>
                          <Text fontWeight="bold" fontSize="lg" color="green.500">
                            KES {gig.earningsPerTrip.toLocaleString()}
            </Text>
          </Box>
      </SimpleGrid>

                      <Box bg="blue.50" p={3} borderRadius="md">
                        <HStack justify="space-between">
                          <Text color="gray.600" fontSize="sm">Potential Earnings</Text>
                          <Text fontWeight="bold" fontSize="lg" color="blue.600">
                            KES {gig.totalEarnings.toLocaleString()}
                          </Text>
                        </HStack>
                      </Box>

                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => router.push(`/freelancer/upload?gigId=${gig.id}`)}
                        leftIcon={<Icon as={FaVideo} />}
                        width="100%"
                      >
                        Record Video
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Completed Gigs Section */}
      <Card mb={[6, 8, 10]}>
        <CardHeader>
          <Heading size={["md", "lg"]} color="gray.700">Completed Gigs</Heading>
        </CardHeader>
        <CardBody>
        <Box overflowX="auto">
            <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Campaign</Th>
                  <Th>Completion Date</Th>
                  <Th isNumeric>Trips</Th>
                  <Th isNumeric>Rate/Trip</Th>
                  <Th isNumeric>Total Earnings</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
                {earnings
                  .filter(gig => gig.status === 'completed')
                  .map((gig) => (
                <Tr key={gig.id}>
                      <Td>{gig.campaignName}</Td>
                      <Td>{gig.date}</Td>
                      <Td isNumeric>{gig.tripsCompleted}</Td>
                      <Td isNumeric>KES {gig.earningsPerTrip.toLocaleString()}</Td>
                      <Td isNumeric>KES {gig.totalEarnings.toLocaleString()}</Td>
                      <Td>
                        <Badge
                          colorScheme="green"
                          fontSize="xs"
                          px={2}
                          py={1}
                          borderRadius="full"
                        >
                          Completed
                        </Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
        </CardBody>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <Heading size={["md", "lg"]} color="gray.700">Quick Actions</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={[2, 3, 4]} spacing={[4, 6]}>
            <Button
              leftIcon={<Icon as={FaVideo} />}
              colorScheme="blue"
              onClick={() => router.push('/freelancer/upload')}
            >
              Record New Video
            </Button>
            <Button
              leftIcon={<Icon as={FaBriefcase} />}
              colorScheme="green"
              onClick={() => router.push('/freelancer/gigs')}
            >
              View Available Gigs
            </Button>
            <Button
              leftIcon={<Icon as={FaChartLine} />}
              colorScheme="purple"
              onClick={() => router.push('/freelancer/profile')}
            >
              View Performance
            </Button>
            <Button
              leftIcon={<Icon as={FaUser} />}
              colorScheme="orange"
              onClick={() => router.push('/freelancer/profile')}
            >
              Update Profile
            </Button>
          </SimpleGrid>
        </CardBody>
      </Card>
    </Container>
  );
}