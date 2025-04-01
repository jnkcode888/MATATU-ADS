// pages/admin/diagnostics.js
import { useState, useEffect } from 'react';
import { Box, Heading, Text, Button, VStack, Spinner, Center, Tabs, TabList, Tab, TabPanels, TabPanel } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase'; // Correct import

const fetchRoutes = async () => {
  const { data, error } = await supabase
    .from('routes')
    .select('id, path');
  if (error) {
    console.error('Error fetching routes:', error);
    return [];
  }
  return data || [];
};

const fetchGigVideos = async () => {
  const { data, error } = await supabase
    .from('gig_videos')
    .select('id, gig_id, trip_number, video_url, route_id, created_at');
  if (error) {
    console.error('Error fetching gig videos:', error);
    return [];
  }
  return data || [];
};

const fetchMessages = async () => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('timestamp', { ascending: false });
  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  return data || [];
};

export default function Diagnostics({ user, userData }) {
  const [routes, setRoutes] = useState([]);
  const [gigVideos, setGigVideos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!user) {
          router.push('/');
          return;
        }
        if (!userData || userData.user_type !== 'admin') {
          if (userData?.user_type === 'freelancer') {
            router.push('/freelancer/profile');
          } else if (userData?.user_type === 'business') {
            router.push('/business/dashboard');
          } else {
            router.push('/');
          }
          return;
        }

        const [routesData, gigVideosData, messagesData] = await Promise.all([
          fetchRoutes(),
          fetchGigVideos(),
          fetchMessages(),
        ]);

        setRoutes(routesData);
        setGigVideos(gigVideosData);
        setMessages(messagesData);
      } catch (error) {
        console.error('Error in checkAuth:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [user, userData, router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
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
    <Box p={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading>Diagnostics Dashboard</Heading>
        <Box>
          <Button colorScheme="gray" mr={4} onClick={() => router.push('/admin')}>
            Back to Admin Dashboard
          </Button>
          <Button colorScheme="red" onClick={handleLogout}>Logout</Button>
        </Box>
      </Box>

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Routes</Tab>
          <Tab>Gig Videos</Tab>
          <Tab>Messages</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <Heading size="md" mb={4}>Routes</Heading>
            {routes.length === 0 ? (
              <Text>No routes found</Text>
            ) : (
              <VStack align="stretch" spacing={4}>
                {routes.map((route) => (
                  <Box key={route.id} p={4} borderWidth="1px" borderRadius="md">
                    <Text fontWeight="bold">Route ID: {route.id}</Text>
                    <Text>Path: {JSON.stringify(route.path)}</Text>
                  </Box>
                ))}
              </VStack>
            )}
          </TabPanel>

          <TabPanel>
            <Heading size="md" mb={4}>Gig Videos</Heading>
            {gigVideos.length === 0 ? (
              <Text>No gig videos found</Text>
            ) : (
              <VStack align="stretch" spacing={4}>
                {gigVideos.map((video) => (
                  <Box key={video.id} p={4} borderWidth="1px" borderRadius="md">
                    <Text fontWeight="bold">Video ID: {video.id}</Text>
                    <Text>Gig ID: {video.gig_id}</Text>
                    <Text>Trip Number: {video.trip_number}</Text>
                    <Text>Video URL: <a href={video.video_url} target="_blank" rel="noopener noreferrer">{video.video_url}</a></Text>
                    <Text>Route ID: {video.route_id}</Text>
                    <Text>Created At: {new Date(video.created_at).toLocaleString()}</Text>
                  </Box>
                ))}
              </VStack>
            )}
          </TabPanel>

          <TabPanel>
            <Heading size="md" mb={4}>Messages</Heading>
            {messages.length === 0 ? (
              <Text>No messages found</Text>
            ) : (
              <VStack align="stretch" spacing={4}>
                {messages.map((message) => (
                  <Box key={message.id} p={4} borderWidth="1px" borderRadius="md">
                    <Text fontWeight="bold">Message ID: {message.id}</Text>
                    <Text>User ID: {message.business_id}</Text>
                    <Text>Content: {message.content}</Text>
                    <Text>Timestamp: {new Date(message.timestamp).toLocaleString()}</Text>
                  </Box>
                ))}
              </VStack>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}