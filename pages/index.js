import { useState, useEffect } from 'react';
import {
  Box, Button, Container, Flex, Grid, Heading, Text, Stack, Icon, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalCloseButton, VStack, HStack, Image, SimpleGrid, List, ListItem,
  ListIcon, Stat, StatLabel, StatNumber, StatHelpText, Divider, IconButton, AspectRatio
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { FaCheckCircle, FaMoneyBillWave, FaHandshake, FaRoute, FaMobileAlt, FaChartLine, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { MdLocalOffer, MdSpeed, MdSecurity } from 'react-icons/md';

// Carousel Component
function Carousel({ items }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
      }, 5000);
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
  const router = useRouter();
  const {
    isOpen: isRegisterOpen,
    onOpen: onRegisterOpen,
    onClose: onRegisterClose
  } = useDisclosure();

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

  const handleRegisterRedirect = (type) => {
    router.push(`/register?type=${type}`);
    onRegisterClose();
  };

  return (
    <Box>
      {/* Navigation */}
      <Box bg="white" py={4} px={8} position="fixed" w="full" shadow="sm" zIndex={10}>
        <Flex justify="space-between" align="center" maxW="7xl" mx="auto">
          <Heading size="lg" bgGradient="linear(to-r, blue.500, teal.500)" bgClip="text">
            Matatu Ads
          </Heading>
          <HStack spacing={4}>
            <Button colorScheme="blue" variant="ghost" onClick={() => router.push('/login')}>
              Login
            </Button>
            <Button colorScheme="blue" onClick={onRegisterOpen}>
              Get Started
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Hero Section */}
      <Box position="relative" height="100vh" width="100%">
        <Box position="absolute" top="0" left="0" right="0" bottom="0" zIndex="0">
          <Carousel items={carouselItems} />
        </Box>
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bgGradient="linear(to-b, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.7) 100%)"
          zIndex="1"
        />
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
                onClick={() => handleRegisterRedirect('business')}
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
                onClick={() => handleRegisterRedirect('freelancer')}
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
              </Text>
              <Text fontSize="lg" color="gray.700">
                That’s exactly what our brand ambassadors do for your products.
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
                text="Save up to 80% compared to traditional billboard advertising"
              />
              <Feature
                icon={FaRoute}
                title="Strategic Routes"
                text="Target specific neighborhoods and demographics"
              />
              <Feature
                icon={FaHandshake}
                title="Personal Touch"
                text="Our freelancers personally engage with commuters"
              />
              <Feature
                icon={FaChartLine}
                title="Real-Time Analytics"
                text="Track your campaign performance with detailed metrics"
              />
              <Feature
                icon={MdSpeed}
                title="Quick Launch"
                text="Get your campaign up and running within 24 hours"
              />
              <Feature
                icon={MdSecurity}
                title="Secure Platform"
                text="End-to-end campaign management with secure payments"
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
                onClick={() => handleRegisterRedirect('business')}
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
                onClick={() => handleRegisterRedirect('freelancer')}
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
    </Box>
  );
}

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