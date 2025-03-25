import { useState, useEffect } from 'react';
import {
  Box, Button, Container, Flex, Grid, Heading, Text, Stack, Icon, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalCloseButton, FormControl, FormLabel, Input, useToast,
  Alert, AlertIcon, VStack, HStack, Image, SimpleGrid, List, ListItem, ListIcon, Stat, StatLabel,
  StatNumber, StatHelpText, Divider, IconButton, AspectRatio
} from '@chakra-ui/react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import { FaCheckCircle, FaMoneyBillWave, FaHandshake, FaRoute, FaMobileAlt, FaChartLine, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { MdSecurity, MdSpeed, MdLocalOffer } from 'react-icons/md';

// Carousel Component
function Carousel({ items }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
      }, 5000); // Change slide every 5 seconds
    }
    return () => clearInterval(interval);
  }, [isPlaying, items.length]);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length);
  };

  return (
    <Box position="relative" width="100%" height="100%">
      <Box
        position="relative"
        width="100%"
        height="100%"
        overflow="hidden"
        borderRadius="lg"
      >
        {items.map((item, index) => (
          <Box
            key={index}
            position="absolute"
            top="0"
            left="0"
            width="100%"
            height="100%"
            opacity={index === currentIndex ? 1 : 0}
            transition="opacity 0.5s ease-in-out"
            zIndex={index === currentIndex ? 1 : 0}
          >
            {item.type === 'video' ? (
              <AspectRatio ratio={16 / 9}>
                <video
                  src={item.url}
                  autoPlay
                  loop
                  muted
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              </AspectRatio>
            ) : (
              <Image
                src={item.url}
                alt={`Matatu ${index + 1}`}
                objectFit="cover"
                width="100%"
                height="100%"
              />
            )}
          </Box>
        ))}
      </Box>
      <IconButton
        aria-label="Previous slide"
        icon={<FaArrowLeft />}
        position="absolute"
        left="2"
        top="50%"
        transform="translateY(-50%)"
        zIndex="2"
        colorScheme="blackAlpha"
        onClick={prevSlide}
        onMouseEnter={() => setIsPlaying(false)}
        onMouseLeave={() => setIsPlaying(true)}
      />
      <IconButton
        aria-label="Next slide"
        icon={<FaArrowRight />}
        position="absolute"
        right="2"
        top="50%"
        transform="translateY(-50%)"
        zIndex="2"
        colorScheme="blackAlpha"
        onClick={nextSlide}
        onMouseEnter={() => setIsPlaying(false)}
        onMouseLeave={() => setIsPlaying(true)}
      />
    </Box>
  );
}

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();
  
  const {
    isOpen: isLoginOpen,
    onOpen: onLoginOpen,
    onClose: onLoginClose
  } = useDisclosure();
  
  const {
    isOpen: isRegisterOpen,
    onOpen: onRegisterOpen,
    onClose: onRegisterClose
  } = useDisclosure();
  
  const {
    isOpen: isResetOpen,
    onOpen: onResetOpen,
    onClose: onResetClose
  } = useDisclosure();

  // Debug logs to verify environment variables
  useEffect(() => {
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_KEY);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);

    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Please enter both email and password',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      if (!data.user) throw new Error('No user returned from login');

      let userProfile = null;
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        if (userError.code === 'PGRST116') {
          console.log('Profile not found, creating a new profile for user:', data.user.id);
          const { data: existingUser, error: emailCheckError } = await supabase
            .from('users')
            .select('id')
            .eq('email', data.user.email)
            .single();

          if (emailCheckError && emailCheckError.code !== 'PGRST116') {
            throw emailCheckError;
          }

          if (existingUser) {
            const { data: updatedProfile, error: updateError } = await supabase
              .from('users')
              .update({
                id: data.user.id,
                user_type: 'freelancer',
                created_at: new Date().toISOString(),
              })
              .eq('email', data.user.email)
              .select('user_type')
              .single();

            if (updateError) {
              console.error('Error updating profile:', updateError);
              throw updateError;
            }
            userProfile = updatedProfile;
          } else {
            const { data: newProfile, error: insertError } = await supabase
              .from('users')
              .insert({
                id: data.user.id,
                email: data.user.email,
                user_type: 'freelancer',
                created_at: new Date().toISOString(),
              })
              .select('user_type')
              .single();

            if (insertError) {
              console.error('Error creating profile:', insertError);
              throw insertError;
            }
            userProfile = newProfile;
          }
        } else {
          throw userError;
        }
      } else {
        userProfile = userData;
      }

      console.log('User type detected:', userProfile.user_type);

      toast({
        title: 'Success',
        description: 'Logged in successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      if (userProfile.user_type === 'admin') {
        console.log('Admin detected, redirecting to /admin');
        setTimeout(() => {
          console.log('Executing admin redirect');
          window.location.href = '/admin';
        }, 1000);
      } else if (userProfile.user_type === 'freelancer') {
        router.push('/freelancer/dashboard');
      } else if (userProfile.user_type === 'business') {
        router.push('/business/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error.message);
      const errorMessage = error.message.includes('Invalid login credentials')
        ? 'Invalid email or password'
        : 'Failed to login. Please try again.';
      setAuthError(errorMessage);
      toast({
        title: 'Login failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!resetEmail) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsResetLoading(true);

    if (!supabase) {
      toast({
        title: 'Error',
        description: 'Failed to initialize Supabase client',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIsResetLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: 'Password Reset Email Sent',
        description: 'Please check your email for a link to reset your password.',
        status: 'success',
        duration: 7000,
        isClosable: true,
      });

      setResetEmail('');
      onResetClose();
    } catch (error) {
      console.error('Password reset failed:', error.message);
      toast({
        title: 'Password Reset Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsResetLoading(false);
    }
  };

  const carouselItems = [
    { type: 'image', url: '/matatu1.jpg' },
    { type: 'image', url: '/matatu2.jpg' },
    { type: 'image', url: '/matatu3.jpg' },
    { type: 'image', url: '/matatu4.jpg' },
    { type: 'image', url: '/matatu5.jpg' },
    { type: 'image', url: '/matatu6.jpg' },
    { type: 'image', url: '/matatu7.jpg' },
    { type: 'image', url: '/matatu8.jpg' },
    { type: 'image', url: '/matatu9.jpg' },
    { type: 'video', url: '/matatu-ad.mp4' },
  ];

  return (
    <Box>
      {/* Navigation */}
      <Box bg="white" py={4} px={8} position="fixed" w="full" shadow="sm" zIndex={10}>
        <Flex justify="space-between" align="center" maxW="7xl" mx="auto">
          <Heading size="lg" bgGradient="linear(to-r, blue.500, teal.500)" bgClip="text">
            Matatu Ads
          </Heading>
          <HStack spacing={4}>
            <Button colorScheme="blue" variant="ghost" onClick={onLoginOpen}>
              Login
            </Button>
            <Button colorScheme="blue" onClick={onRegisterOpen}>
              Get Started
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Hero Section with Full-width Carousel */}
      <Box position="relative" height="100vh" width="100%">
        {/* Full-width Carousel */}
        <Box position="absolute" top="0" left="0" right="0" bottom="0" zIndex="0">
          <Carousel items={carouselItems} />
        </Box>

        {/* Gradient Overlay */}
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bgGradient="linear(to-b, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.7) 100%)"
          zIndex="1"
        />

        {/* Content Overlay */}
        <Container maxW="7xl" position="relative" zIndex="2" height="100%" pt={28}>
          <VStack
            spacing={6}
            align="center"
            justify="center"
            height="100%"
            color="white"
            textAlign="center"
            px={4}
          >
            <Heading
              as="h1"
              size="2xl"
              mb={4}
              bgGradient="linear(to-r, white, blue.200)"
              bgClip="text"
              textShadow="0 2px 10px rgba(0,0,0,0.3)"
              filter="drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
            >
              Turn Every Commute into a Sales Opportunity
            </Heading>
            <Text 
              fontSize="xl" 
              maxW="2xl"
              textShadow="0 2px 4px rgba(0,0,0,0.5)"
              fontWeight="medium"
            >
              Connect with thousands of daily commuters through our network of passionate brand ambassadors. 
              Just like matatu preachers who captivate their audience, we bring your products to life.
            </Text>
            <Text 
              fontSize="2xl" 
              fontWeight="bold" 
              bgGradient="linear(to-r, blue.200, teal.200)" 
              bgClip="text"
              textShadow="0 2px 10px rgba(0,0,0,0.3)"
              filter="drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
            >
              Starting at KES 250,000/month
            </Text>
            <Stack 
              direction={{ base: 'column', sm: 'row' }} 
              spacing={4} 
              mt={4}
              filter="drop-shadow(0 4px 8px rgba(0,0,0,0.2))"
            >
              <Button
                size="lg"
                colorScheme="blue"
                px={8}
                onClick={onRegisterOpen}
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'xl',
                }}
                transition="all 0.2s"
              >
                Start Advertising
              </Button>
              <Button
                size="lg"
                onClick={onRegisterOpen}
                variant="solid"
                colorScheme="whiteAlpha"
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'xl',
                  bg: 'whiteAlpha.300',
                }}
                transition="all 0.2s"
              >
                Become a Freelance Brand Ambassador
              </Button>
            </Stack>
          </VStack>
        </Container>
      </Box>

      {/* The Matatu Story Section */}
      <Box py={16} bg="white">
        <Container maxW="7xl">
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={12} alignItems="center">
            <Box>
              <Heading size="xl" mb={6} color="blue.600">
                The Power of Personal Connection
              </Heading>
              <Text fontSize="lg" color="gray.700" mb={4}>
                Ever noticed how matatu preachers transform a simple commute into an unforgettable experience? 
                How they engage every passenger, share their message, and inspire action?
              </Text>
              <Text fontSize="lg" color="gray.700">
                Thats exactly what our brand ambassadors do for your products. They dont just advertise - 
                they create genuine connections, share your story, and turn commuters into customers. 
                Its personal, its powerful, and it works.
              </Text>
            </Box>
            <Box 
              bg="blue.50" 
              p={8}
              rounded="xl" 
              shadow="xl"
              borderLeft="4px"
              borderColor="blue.500"
            >
              <SimpleGrid columns={2} spacing={6}>
                <Stat>
                  <StatNumber fontSize="4xl" color="blue.500">80%</StatNumber>
                  <StatLabel fontSize="lg">Cost Savings</StatLabel>
                  <StatHelpText>vs. Billboards</StatHelpText>
                </Stat>
                <Stat>
                  <StatNumber fontSize="4xl" color="blue.500">50K+</StatNumber>
                  <StatLabel fontSize="lg">Daily Views</StatLabel>
                  <StatHelpText>Per Campaign</StatHelpText>
                </Stat>
                <Stat>
                  <StatNumber fontSize="4xl" color="blue.500">24h</StatNumber>
                  <StatLabel fontSize="lg">Launch Time</StatLabel>
                  <StatHelpText>Quick Start</StatHelpText>
                </Stat>
                <Stat>
                  <StatNumber fontSize="4xl" color="blue.500">2X</StatNumber>
                  <StatLabel fontSize="lg">Engagement</StatLabel>
                  <StatHelpText>vs. Static Ads</StatHelpText>
                </Stat>
              </SimpleGrid>
            </Box>
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box py={16} bg="white">
        <Container maxW="7xl">
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
            <Stat textAlign="center">
              <StatNumber fontSize="5xl" color="blue.500">80%</StatNumber>
              <StatLabel fontSize="lg">Cost Savings</StatLabel>
              <StatHelpText>Compared to traditional billboards</StatHelpText>
            </Stat>
            <Stat textAlign="center">
              <StatNumber fontSize="5xl" color="blue.500">50K+</StatNumber>
              <StatLabel fontSize="lg">Daily Views</StatLabel>
              <StatHelpText>Per matatu campaign</StatHelpText>
            </Stat>
            <Stat textAlign="center">
              <StatNumber fontSize="5xl" color="blue.500">2X</StatNumber>
              <StatLabel fontSize="lg">Engagement Rate</StatLabel>
              <StatHelpText>Higher than static advertising</StatHelpText>
            </Stat>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box py={16} bg="gray.50">
        <Container maxW="7xl">
          <VStack spacing={12}>
            <Box textAlign="center">
              <Heading mb={4}>Why Choose Matatu Ads?</Heading>
              <Text color="gray.600" fontSize="lg">
                Get more value and better results with our innovative mobile advertising platform
              </Text>
            </Box>
            
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10}>
              <Feature
                icon={FaMoneyBillWave}
                title="Cost-Effective"
                text="Save up to 80% compared to traditional billboard advertising while reaching more targeted audiences"
              />
              <Feature
                icon={FaRoute}
                title="Strategic Routes"
                text="Target specific neighborhoods and demographics with customized route selection"
              />
              <Feature
                icon={FaHandshake}
                title="Personal Touch"
                text="Our freelancers personally engage with commuters, creating memorable brand experiences"
              />
              <Feature
                icon={FaChartLine}
                title="Real-Time Analytics"
                text="Track your campaign performance with detailed metrics and engagement data"
              />
              <Feature
                icon={MdSpeed}
                title="Quick Launch"
                text="Get your campaign up and running within 24 hours of approval"
              />
              <Feature
                icon={MdSecurity}
                title="Secure Platform"
                text="End-to-end campaign management with secure payments and verified freelancers"
              />
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Pricing Comparison */}
      <Box py={16} bg="white">
        <Container maxW="7xl">
          <Heading textAlign="center" mb={12}>Advertising Cost Comparison</Heading>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8}>
            <PricingCard
              title="Traditional Billboard"
              price="650,000"
              duration="per month"
              features={[
                'Limited to one location',
                'Static display',
                'No engagement metrics',
                'High setup costs',
                'Long-term contracts required',
              ]}
              isHighlighted={false}
            />
            <PricingCard
              title="Matatu Ads"
              price="250,000"
              duration="per month"
              features={[
                'Multiple dynamic locations',
                'Interactive campaigns',
                'Detailed analytics',
                'Flexible duration',
                'Personal brand ambassadors',
              ]}
              isHighlighted={true}
            />
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box py={16} bgGradient="linear(to-r, blue.600, blue.700)" color="white">
        <Container maxW="7xl">
          <Stack spacing={8} align="center" textAlign="center">
            <Heading>Ready to Transform Your Advertising?</Heading>
            <Text fontSize="lg" maxW="2xl">
              Join hundreds of businesses already succeeding with Matatu Ads. 
              Start your campaign today and reach thousands of potential customers.
            </Text>
            <Button
              size="lg"
              colorScheme="whiteAlpha"
              onClick={onRegisterOpen}
            >
              Get Started Now
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Login Modal */}
      <Modal isOpen={isLoginOpen} onClose={onLoginClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Welcome Back</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              {authError && (
                <Alert status="error">
                  <AlertIcon />
                  {authError}
                </Alert>
              )}
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormControl>
              <Button
                colorScheme="blue"
                width="full"
                onClick={handleLogin}
                isLoading={isLoading}
              >
                Login
              </Button>
              <Button variant="link" onClick={onResetOpen}>
                Forgot Password?
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Register Modal */}
      <Modal isOpen={isRegisterOpen} onClose={onRegisterClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Choose Your Path</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <SimpleGrid columns={2} spacing={4}>
              <Button
                height="200px"
                onClick={() => router.push('/register?type=business')}
                colorScheme="blue"
                variant="outline"
              >
                <VStack>
                  <Icon as={MdLocalOffer} w={10} h={10} />
                  <Text fontWeight="bold">Business</Text>
                  <Text fontSize="sm">Create advertising campaigns</Text>
                </VStack>
              </Button>
              <Button
                height="200px"
                onClick={() => router.push('/register?type=freelancer')}
                colorScheme="teal"
                variant="outline"
              >
                <VStack>
                  <Icon as={FaMobileAlt} w={10} h={10} />
                  <Text fontWeight="bold">Freelancer</Text>
                  <Text fontSize="sm">Earn by promoting campaigns</Text>
                </VStack>
              </Button>
            </SimpleGrid>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={isResetOpen} onClose={onResetClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Reset Password</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </FormControl>
            <Button
              mt={4}
              colorScheme="blue"
              width="full"
              onClick={handleForgotPassword}
              isLoading={isResetLoading}
            >
              Send Reset Link
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}

// Feature Component
function Feature({ icon, title, text }) {
  return (
    <VStack
      bg="white"
      p={6}
      rounded="lg"
      shadow="md"
      textAlign="center"
      spacing={4}
    >
      <Icon as={icon} w={10} h={10} color="blue.500" />
      <Text fontWeight="bold" fontSize="lg">{title}</Text>
      <Text color="gray.600">{text}</Text>
    </VStack>
  );
}

// Pricing Card Component
function PricingCard({ title, price, duration, features, isHighlighted }) {
  return (
    <Box
      bg={isHighlighted ? 'blue.50' : 'white'}
      p={8}
      rounded="lg"
      shadow="lg"
      border="1px"
      borderColor={isHighlighted ? 'blue.200' : 'gray.200'}
    >
      <VStack spacing={4} align="stretch">
        <Heading size="lg">{title}</Heading>
        <HStack>
          <Text fontSize="3xl" fontWeight="bold">KES {price}</Text>
          <Text color="gray.500">/{duration}</Text>
        </HStack>
        <Divider />
        <List spacing={3}>
          {features.map((feature, index) => (
            <ListItem key={index}>
              <ListIcon as={FaCheckCircle} color={isHighlighted ? 'blue.500' : 'gray.500'} />
              {feature}
            </ListItem>
          ))}
        </List>
      </VStack>
    </Box>
  );
}

export async function getStaticProps() {
  return { props: {} };
}