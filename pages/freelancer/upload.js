// pages/freelancer/upload.js
import { 
  Box, Heading, Button, Text, useToast, Progress, 
  Icon, Spinner, Alert, AlertIcon, VStack, SimpleGrid, Badge,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Input, Select, Container, HStack, Divider,
  useDisclosure, Card, CardBody, CardHeader, CardFooter,
  Stat, StatLabel, StatNumber, StatHelpText, StatArrow,
  Tooltip, IconButton, Radio, RadioGroup, Menu, MenuButton, MenuList, MenuItem
} from '@chakra-ui/react';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';
import { 
  FaVideo, 
  FaStopCircle, 
  FaMapMarkerAlt, 
  FaClock, 
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaUpload,
  FaCamera,
  FaLocationDot,
  FaChartBar,
  FaUser,
  FaCalendarAlt,
  FaInbox,
  FaMoneyBillWave,
  FaBriefcase,
  FaChevronDown,
  FaSignOutAlt
} from 'react-icons/fa';

export default function Upload() {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [routeData, setRouteData] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRouterReady, setIsRouterReady] = useState(false);
  const [gigs, setGigs] = useState([]);
  const [selectedGigTrip, setSelectedGigTrip] = useState(null);
  const [isRecordingStarted, setIsRecordingStarted] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [analyticsData, setAnalyticsData] = useState({
    impressions: '',
    audienceAgeGroup: '',
    audienceGender: '',
    engagementLevel: '',
    comments: ''
  });
  const [showRecordingOverlay, setShowRecordingOverlay] = useState(false);
  const [showAnalyticsForm, setShowAnalyticsForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCameraSelect, setShowCameraSelect] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState('user'); // 'user' for front, 'environment' for back

  const router = useRouter();
  const toast = useToast();
  const videoPreviewRef = useRef(null);
  const geoWatchId = useRef(null);

  useEffect(() => {
    if (router.isReady) {
      setIsRouterReady(true);
    }
  }, [router.isReady]);

  useEffect(() => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      const errorMsg = 'Cloudinary environment variables are missing. Contact support.';
      setErrorMessage(errorMsg);
      toast({
        title: 'Configuration Error',
        description: errorMsg,
        status: 'error',
        duration: 5000,
      });
    }
  }, [toast]);

  useEffect(() => {
    const fetchGigsAndTrips = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw new Error(`Failed to fetch session: ${sessionError.message}`);
        if (!session) throw new Error('Not authenticated. Please log in.');

        const { data: gigsData, error: gigsError } = await supabase
          .from('gigs')
          .select(`
            id,
            trips_assigned,
            deadline,
            status,
            submitted_at,
            campaigns:campaign_id (id, product_name)
          `)
          .eq('freelancer_id', session.user.id)
          .eq('status', 'assigned');

        if (gigsError) throw new Error(`Failed to fetch gigs: ${gigsError.message}`);
        if (!gigsData || gigsData.length === 0) {
          setErrorMessage('No assigned gigs found. Please accept a gig first.');
          return;
        }

        const gigIds = gigsData.map(gig => gig.id);
        const { data: videosData, error: videosError } = await supabase
          .from('gig_videos')
          .select('gig_id, trip_number, video_url')
          .in('gig_id', gigIds);

        if (videosError) throw new Error(`Failed to fetch gig videos: ${videosError.message}`);

        const gigsWithTrips = gigsData.map(gig => {
          const videosForGig = videosData.filter(video => video.gig_id === gig.id);
          const trips = Array.from({ length: gig.trips_assigned }, (_, index) => {
            const tripNumber = index + 1;
            const video = videosForGig.find(v => v.trip_number === tripNumber);
            return {
              tripNumber,
              status: video ? 'uploaded' : 'pending',
              videoUrl: video?.video_url || null,
            };
          });

          return {
            ...gig,
            trips,
            isExpired: gig.deadline && new Date(gig.deadline) < new Date(),
          };
        });

        setGigs(gigsWithTrips);
      } catch (error) {
        setErrorMessage(error.message || 'Failed to load gigs. Please try again.');
        toast({
          title: 'Error',
          description: error.message || 'An unexpected error occurred.',
          status: 'error',
          duration: 5000,
        });
      }
    };

    if (isRouterReady) fetchGigsAndTrips();
  }, [isRouterReady, toast]);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support video recording. Please use a modern browser.');
      }

      // First show the recording overlay
      setShowRecordingOverlay(true);

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: selectedCamera,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      if (!videoTrack) throw new Error('No video track found. Please check your camera connection.');
      if (!audioTrack) throw new Error('No audio track found. Please check your microphone connection.');

      // Set the video source and ensure it's playing
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        try {
          await videoPreviewRef.current.play();
        } catch (playError) {
          console.error('Error playing video:', playError);
          // Try to play again after a short delay
          setTimeout(async () => {
            try {
              await videoPreviewRef.current.play();
            } catch (retryError) {
              console.error('Error playing video after retry:', retryError);
            }
          }, 100);
        }
      }

      const options = { 
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 2500000
      };
      
      const recorder = new MediaRecorder(stream, options);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setRecordedChunks(prev => [...prev, e.data]);
        }
      };

      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);

      geoWatchId.current = navigator.geolocation.watchPosition(
        (position) => {
          setRouteData(prev => [...prev, {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            timestamp: new Date().toISOString(),
            accuracy: position.coords.accuracy
          }]);
        },
        (error) => {
          console.error('Location error:', error);
          toast({ 
            title: 'Location Error', 
            description: 'Unable to track location. Please ensure location services are enabled.',
            status: 'warning',
            duration: 5000,
          });
        },
        { 
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );

    } catch (error) {
      console.error('Recording error:', error);
      let errorMessage = 'Failed to start recording. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera and microphone access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera or microphone found. Please check your device connections.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera or microphone is already in use by another application.';
      } else {
        errorMessage += error.message || 'Please check your device permissions.';
      }

      setErrorMessage(errorMessage);
      toast({ 
        title: 'Recording Failed', 
        description: errorMessage,
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setShowRecordingOverlay(false);
      setShowAnalyticsForm(true);
      navigator.geolocation.clearWatch(geoWatchId.current);
    }
  };

  const handleUpload = async () => {
    if (!recordedChunks.length || !routeData.length || !selectedGigTrip) {
      toast({ 
        title: 'Missing Data', 
        description: 'Please record a video, enable location tracking, and select a gig/trip.', 
        status: 'warning',
        duration: 5000,
      });
      return;
    }

    if (!analyticsData.impressions || analyticsData.impressions <= 0) {
      toast({
        title: 'Missing Data',
        description: 'Please enter the number of people on the trip (impressions).',
        status: 'warning',
        duration: 5000,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user || !session.user.id) {
        throw new Error('Not authenticated or invalid session. Please log in.');
      }

      console.log('Authenticated user ID from session:', session.user.id);

      // Debug: Fetch the current user directly from auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(`Failed to fetch auth user: ${userError.message}`);
      console.log('Authenticated user ID from auth.getUser:', user?.id);

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error('Missing Cloudinary configuration.');
      }

      const videoBlob = new Blob(recordedChunks, { type: 'video/mp4' });
      const formData = new FormData();
      formData.append('file', videoBlob);
      formData.append('upload_preset', uploadPreset);
      formData.append('resource_type', 'video');

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        formData,
        {
          onUploadProgress: (progress) => {
            const percentage = Math.round((progress.loaded * 100) / progress.total);
            setUploadProgress(percentage);
          },
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000
        }
      );

      const cloudinaryData = response.data;
      if (!cloudinaryData?.secure_url) throw new Error('Cloudinary response missing secure URL');

      // First, insert the route with the proper structure
      const { data: route, error: routeError } = await supabase
        .from('routes')
        .insert([{
          path: routeData,
          freelancer_id: session.user.id,
          coordinates: routeData.map(point => ({
            lat: point.lat,
            lon: point.lon
          })),
          name: `Route for Gig ${selectedGigTrip.gigId}`,
          rate: 0 // Default rate, can be updated later
        }])
        .select()
        .single();

      if (routeError) {
        console.error('Route insertion error:', routeError);
        throw new Error(`Failed to insert route: ${routeError.message}`);
      }

      if (!route) {
        throw new Error('Failed to create route record');
      }

      // Then insert the video with the route reference
      const { data: videoData, error: videoError } = await supabase
        .from('gig_videos')
        .insert({
          gig_id: selectedGigTrip.gigId,
          trip_number: selectedGigTrip.tripNumber,
          video_url: cloudinaryData.secure_url,
          route_id: route.id,
          created_at: new Date().toISOString(),
          analytics: {
            impressions: Number(analyticsData.impressions),
            audience_age_group: analyticsData.audienceAgeGroup || null,
            audience_gender: analyticsData.audienceGender || null,
            engagement_level: analyticsData.engagementLevel || null,
            comments: analyticsData.comments || null
          }
        })
        .select();

      if (videoError) throw new Error(`Failed to insert video: ${videoError.message}`);

      const { data: freelancerData, error: fetchFreelancerError } = await supabase
        .from('users')
        .select('impressions, analytics')
        .eq('id', session.user.id)
        .single();

      if (fetchFreelancerError) throw new Error(`Failed to fetch freelancer data: ${fetchFreelancerError.message}`);

      const currentImpressions = freelancerData.impressions || 0;
      const currentAnalytics = freelancerData.analytics || {};
      const updatedAnalytics = {
        ...currentAnalytics,
        impressions: (currentAnalytics.impressions || 0) + Number(analyticsData.impressions),
        audience_age_groups: {
          ...(currentAnalytics.audience_age_groups || {}),
          [analyticsData.audienceAgeGroup || 'unknown']: ((currentAnalytics.audience_age_groups || {})[analyticsData.audienceAgeGroup || 'unknown'] || 0) + 1
        },
        audience_genders: {
          ...(currentAnalytics.audience_genders || {}),
          [analyticsData.audienceGender || 'unknown']: ((currentAnalytics.audience_genders || {})[analyticsData.audienceGender || 'unknown'] || 0) + 1
        },
        engagement_levels: {
          ...(currentAnalytics.engagement_levels || {}),
          [analyticsData.engagementLevel || 'unknown']: ((currentAnalytics.engagement_levels || {})[analyticsData.engagementLevel || 'unknown'] || 0) + 1
        }
      };

      const { error: updateFreelancerError } = await supabase
        .from('users')
        .update({
          impressions: currentImpressions + Number(analyticsData.impressions),
          analytics: updatedAnalytics,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (updateFreelancerError) throw new Error(`Failed to update freelancer data: ${updateFreelancerError.message}`);

      const updatedGigs = gigs.map(gig => {
        if (gig.id === selectedGigTrip.gigId) {
          const updatedTrips = gig.trips.map(trip => {
            if (trip.tripNumber === selectedGigTrip.tripNumber) {
              return { ...trip, status: 'uploaded', videoUrl: cloudinaryData.secure_url };
            }
            return trip;
          });

          const allTripsUploaded = updatedTrips.every(trip => trip.status === 'uploaded');
          if (allTripsUploaded) {
            supabase
              .from('gigs')
              .update({ 
                status: 'submitted',
                submitted_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', gig.id);
          }

          return { ...gig, trips: updatedTrips };
        }
        return gig;
      });

      setGigs(updatedGigs);

      toast({
        title: `Video for Trip ${selectedGigTrip.tripNumber} Uploaded`,
        description: `Video for trip ${selectedGigTrip.tripNumber} of gig ${selectedGigTrip.gigId} has been uploaded.`,
        status: 'success',
        duration: 3000,
      });

      setSelectedGigTrip(null);
      setIsRecordingStarted(false);
      setRecordedChunks([]);
      setRouteData([]);
      setUploadProgress(0);
      setAnalyticsData({
        impressions: '',
        audienceAgeGroup: '',
        audienceGender: '',
        engagementLevel: '',
        comments: ''
      });
      setShowSuccessModal(true);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to upload video. Please try again.');
      toast({ 
        title: 'Upload Error', 
        description: error.message || 'Failed to upload video. Please try again.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectTrip = (gigId, tripNumber) => {
    setSelectedGigTrip({ gigId, tripNumber });
    setIsRecordingStarted(true);
    setRecordedChunks([]);
    setRouteData([]);
    setUploadProgress(0);
    setAnalyticsData({
      impressions: '',
      audienceAgeGroup: '',
      audienceGender: '',
      engagementLevel: '',
      comments: ''
    });
  };

  const handleCloseModal = () => {
    if (isRecording) stopRecording();
    setIsRecordingStarted(false);
    setSelectedGigTrip(null);
    setAnalyticsData({
      impressions: '',
      audienceAgeGroup: '',
      audienceGender: '',
      engagementLevel: '',
      comments: ''
    });
  };

  const handleStartRecording = () => {
    setShowCameraSelect(true);
  };

  const handleCameraSelect = () => {
    setShowCameraSelect(false);
    startRecording();
  };

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

  if (errorMessage) {
    return (
      <Box p={8} textAlign="center">
        <Alert status="error">
          <AlertIcon />
          <Text>{errorMessage}</Text>
        </Alert>
        <Button mt={4} onClick={() => router.push('/freelancer/gigs')}>
          Back to Gigs
        </Button>
      </Box>
    );
  }

  if (!isRouterReady) {
    return (
      <Box p={8} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Loading verification session...</Text>
      </Box>
    );
  }

  if (gigs.length === 0) {
    return (
      <Box p={8} textAlign="center">
        <Text>No assigned gigs found. Please accept a gig to start uploading videos.</Text>
        <Button mt={4} onClick={() => router.push('/freelancer/gigs')}>
          Go to Gigs
        </Button>
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
            Upload Video
          </Heading>
          <Text color="gray.600" mt={2} fontSize={["md", "lg"]}>Record and upload your campaign videos</Text>
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
            onClick={() => router.push('/freelancer/earnings')}
            colorScheme="blue"
            variant="ghost"
            size="sm"
            leftIcon={<Icon as={FaMoneyBillWave} />}
          >
            Earnings
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

      {/* Assigned Gigs Grid */}
      <SimpleGrid columns={[1, 2, 3]} spacing={[4, 6]}>
        {gigs.map(gig => (
          <Card key={gig.id} variant="outline">
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Heading size={["sm", "md"]} color="blue.600">
                    {gig.campaigns?.product_name || `Campaign #${gig.id}`}
                  </Heading>
                  <Text color="gray.600" mt={1} fontSize={["sm", "md"]}>
                    {gig.trips_assigned} trips assigned
                  </Text>
                </Box>
                <Progress 
                  value={(gig.trips.filter(trip => trip.status === 'uploaded').length / gig.trips.length) * 100} 
                  colorScheme="blue"
                  size="sm"
                  borderRadius="full"
                />
                <Text fontSize={["xs", "sm"]} color="gray.600">
                  {gig.trips.filter(trip => trip.status === 'uploaded').length} of {gig.trips.length} trips completed
                </Text>
                <Button
                  colorScheme="blue"
                  leftIcon={<Icon as={FaVideo} />}
                  onClick={() => {
                    setSelectedGigTrip({
                      gigId: gig.id,
                      tripNumber: gig.trips.find(trip => trip.status === 'pending')?.tripNumber || 1
                    });
                    handleStartRecording();
                  }}
                  isDisabled={!gig.trips.some(trip => trip.status === 'pending')}
                  size={["sm", "md"]}
                >
                  Record Video
                </Button>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* Camera Selection Modal */}
      <Modal isOpen={showCameraSelect} onClose={() => setShowCameraSelect(false)} size={["sm", "md"]}>
        <ModalOverlay />
        <ModalContent mx={[2, 0]}>
          <ModalHeader fontSize={["lg", "xl"]}>Select Camera</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <RadioGroup onChange={setSelectedCamera} value={selectedCamera}>
                <VStack align="start" spacing={4}>
                  <Radio value="user" size={["sm", "md"]}>
                    <HStack>
                      <Icon as={FaUser} />
                      <Text fontSize={["sm", "md"]}>Front Camera (Selfie)</Text>
                    </HStack>
                  </Radio>
                  <Radio value="environment" size={["sm", "md"]}>
                    <HStack>
                      <Icon as={FaCamera} />
                      <Text fontSize={["sm", "md"]}>Back Camera</Text>
                    </HStack>
                  </Radio>
                </VStack>
              </RadioGroup>
              <Button
                colorScheme="blue"
                width="full"
                onClick={handleCameraSelect}
                leftIcon={<Icon as={FaVideo} />}
                size={["sm", "md"]}
              >
                Start Recording
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Recording Modal */}
      <Modal isOpen={showRecordingOverlay} onClose={stopRecording} size={["full", "xl"]}>
        <ModalOverlay />
        <ModalContent mx={[0, 4]} my={[0, 4]}>
          <ModalHeader fontSize={["lg", "xl"]}>Record Video</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Box 
              position="relative" 
              width="100%" 
              maxWidth="800px" 
              mx="auto"
              bg="black"
              borderRadius="8px"
              overflow="hidden"
              aspectRatio="16/9"
            >
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                style={{ 
                  width: '100%', 
                  height: '100%',
                  objectFit: 'cover',
                  backgroundColor: 'black',
                  transform: selectedCamera === 'user' ? 'scaleX(-1)' : 'none',
                  display: 'block',
                  position: 'relative',
                  zIndex: 1
                }}
              />
              <Box
                position="absolute"
                top={[2, 4]}
                right={[2, 4]}
                bg="red.500"
                color="white"
                px={[2, 4]}
                py={[1, 2]}
                borderRadius="md"
                display="flex"
                alignItems="center"
                fontSize={["sm", "lg"]}
                zIndex={2}
              >
                <Icon as={FaVideo} mr={[1, 2]} />
                Recording...
              </Box>
              <Button
                position="absolute"
                bottom={[2, 4]}
                left="50%"
                transform="translateX(-50%)"
                colorScheme="red"
                size={["md", "lg"]}
                onClick={stopRecording}
                leftIcon={<Icon as={FaStopCircle} />}
                zIndex={2}
              >
                Stop Recording
              </Button>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Analytics Form Modal */}
      <Modal isOpen={showAnalyticsForm} onClose={() => setShowAnalyticsForm(false)} size={["sm", "md"]}>
        <ModalOverlay />
        <ModalContent mx={[2, 0]}>
          <ModalHeader fontSize={["lg", "xl"]}>Trip Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontSize={["sm", "md"]}>Number of People on Trip</FormLabel>
                <Input
                  type="number"
                  value={analyticsData.impressions}
                  onChange={(e) => setAnalyticsData(prev => ({ ...prev, impressions: e.target.value }))}
                  placeholder="Enter number of people"
                  size={["sm", "md"]}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize={["sm", "md"]}>Audience Age Group</FormLabel>
                <Select
                  value={analyticsData.audienceAgeGroup}
                  onChange={(e) => setAnalyticsData(prev => ({ ...prev, audienceAgeGroup: e.target.value }))}
                  size={["sm", "md"]}
                >
                  <option value="">Select age group</option>
                  <option value="18-24">18-24</option>
                  <option value="25-34">25-34</option>
                  <option value="35-44">35-44</option>
                  <option value="45+">45+</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize={["sm", "md"]}>Audience Gender</FormLabel>
                <Select
                  value={analyticsData.audienceGender}
                  onChange={(e) => setAnalyticsData(prev => ({ ...prev, audienceGender: e.target.value }))}
                  size={["sm", "md"]}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="mixed">Mixed</option>
                </Select>
              </FormControl>
              <Button
                colorScheme="blue"
                width="full"
                onClick={handleUpload}
                isLoading={isSubmitting}
                isDisabled={!analyticsData.impressions}
                size={["sm", "md"]}
              >
                Upload Video
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={showSuccessModal} onClose={() => {
        setShowSuccessModal(false);
        setShowAnalyticsForm(false);
        router.reload();
      }} size={["sm", "md"]}>
        <ModalOverlay />
        <ModalContent mx={[2, 0]}>
          <ModalHeader fontSize={["lg", "xl"]}>Success!</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <Icon as={FaCheckCircle} w={[8, 12]} h={[8, 12]} color="green.500" />
              <Text textAlign="center" fontSize={["sm", "md"]}>Your video has been uploaded successfully!</Text>
              <Button
                colorScheme="blue"
                width="full"
                onClick={() => {
                  setShowSuccessModal(false);
                  setShowAnalyticsForm(false);
                  router.reload();
                }}
                size={["sm", "md"]}
              >
                Done
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
}