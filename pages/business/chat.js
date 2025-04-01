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
  useColorModeValue,
  Avatar,
  Textarea,
  Divider,
  Badge,
  Flex,
  Spacer,
  Tooltip,
} from '@chakra-ui/react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';
import { 
  FaVideo, 
  FaMoneyBillWave, 
  FaInbox, 
  FaSignOutAlt,
  FaChevronDown,
  FaPaperPlane,
  FaClock,
  FaUserShield,
  FaHome,
} from 'react-icons/fa';

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const toast = useToast();
  
  const bgColor = useColorModeValue('white', 'gray.800');
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

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const message = {
        id: Date.now(),
        text: newMessage,
        sender: 'user',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, message]);
      setNewMessage('');

      // Simulate admin response
      setTimeout(() => {
        const response = {
          id: Date.now(),
          text: 'Thank you for your message. Our team will get back to you shortly.',
          sender: 'admin',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, response]);
      }, 1000);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
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
            Chat with Admin
          </Heading>
          <Text color="gray.600" mt={2} fontSize={["md", "lg"]}>Get support and assistance</Text>
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

      {/* Chat Interface */}
      <Card bg="white" borderRadius="xl" boxShadow="sm">
        <CardBody>
          <VStack spacing={6} align="stretch" h="600px">
            {/* Welcome Message */}
            {messages.length === 0 && (
              <Box textAlign="center" py={8}>
                <Icon as={FaUserShield} w={12} h={12} color="blue.500" mb={4} />
                <Heading size="md" mb={2}>Welcome to Support Chat</Heading>
                <Text color="gray.600" mb={4}>
                  Our support team is here to help you with any questions or concerns.
                </Text>
                <Badge colorScheme="blue" fontSize="sm" p={2} borderRadius="md">
                  Average response time: 5 minutes
                </Badge>
              </Box>
            )}

            {/* Messages Area */}
            <Box flex={1} overflowY="auto" p={4}>
              <VStack spacing={4} align="stretch">
                {messages.map((message) => (
                  <Box
                    key={message.id}
                    alignSelf={message.sender === 'user' ? 'flex-end' : 'flex-start'}
                    maxW="80%"
                  >
                    <Flex align="center" mb={1}>
                      <Avatar size="sm" name={message.sender === 'user' ? 'You' : 'Admin'} />
                      <Box ml={2}>
                        <Text fontSize="sm" fontWeight="medium">
                          {message.sender === 'user' ? 'You' : 'Admin'}
                        </Text>
                        <Tooltip label={new Date(message.timestamp).toLocaleString()}>
                          <Text fontSize="xs" color="gray.500">
                            <Icon as={FaClock} mr={1} />
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </Text>
                        </Tooltip>
                      </Box>
                    </Flex>
                    <Box
                      bg={message.sender === 'user' ? 'blue.500' : 'gray.100'}
                      color={message.sender === 'user' ? 'white' : 'gray.800'}
                      p={3}
                      borderRadius="lg"
                      boxShadow="sm"
                      position="relative"
                      _before={{
                        content: '""',
                        position: 'absolute',
                        top: '50%',
                        [message.sender === 'user' ? 'right' : 'left']: '-8px',
                        transform: 'translateY(-50%)',
                        border: '8px solid transparent',
                        borderRightColor: message.sender === 'user' ? 'blue.500' : 'gray.100',
                        borderLeftColor: message.sender === 'user' ? 'transparent' : 'gray.100',
                      }}
                    >
                      <Text>{message.text}</Text>
                    </Box>
                  </Box>
                ))}
              </VStack>
            </Box>

            {/* Message Input */}
            <Divider />
            <HStack spacing={4}>
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                resize="none"
                rows={2}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                colorScheme="blue"
                onClick={handleSendMessage}
                isDisabled={!newMessage.trim()}
                leftIcon={<Icon as={FaPaperPlane} />}
              >
                Send
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </Container>
  );
}