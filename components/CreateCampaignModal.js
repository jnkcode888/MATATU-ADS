import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useToast,
  Text,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const PRICE_PER_TRIP = 1000; // Fixed price per trip in KES

export default function CreateCampaignModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const [formData, setFormData] = useState({
    product_name: '',
    script: '',
    route: '',
    phone_number: '',
    trips_needed: 1,
    budget: 0,
    price_per_trip: PRICE_PER_TRIP,
    deadline: '',
  });

  // Fetch user's phone number when modal opens
  useEffect(() => {
    const fetchUserPhone = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData, error } = await supabase
            .from('users')
            .select('phone_number')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          
          if (userData?.phone_number) {
            setFormData(prev => ({
              ...prev,
              phone_number: userData.phone_number
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching user phone:', error);
      }
    };

    if (isOpen) {
      fetchUserPhone();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // If phone number changed, update user's phone number
      if (formData.phone_number) {
        const { error: phoneUpdateError } = await supabase
          .from('users')
          .update({ phone_number: formData.phone_number })
          .eq('id', user.id);

        if (phoneUpdateError) throw phoneUpdateError;
      }

      // Create campaign
      const { data, error } = await supabase
        .from('campaigns')
        .insert([
          {
            ...formData,
            business_id: user.id,
            status: 'pending',
            trips_remaining: formData.trips_needed,
            created_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Campaign Created',
        description: 'Your campaign has been created successfully. Admin will review and contact you shortly.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onSuccess(data);
      onClose();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create campaign',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'budget') {
      // Calculate trips based on budget
      const budget = parseFloat(value) || 0;
      const trips = Math.floor(budget / PRICE_PER_TRIP);
      
      setFormData(prev => ({
        ...prev,
        budget: budget,
        trips_needed: trips,
        price_per_trip: PRICE_PER_TRIP
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>Create New Campaign</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Product Name</FormLabel>
                <Input
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleChange}
                  placeholder="Enter product name"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Campaign Script</FormLabel>
                <Textarea
                  name="script"
                  value={formData.script}
                  onChange={handleChange}
                  placeholder="Enter your campaign script"
                  rows={4}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Route</FormLabel>
                <Input
                  name="route"
                  value={formData.route}
                  onChange={handleChange}
                  placeholder="Enter route (e.g., Westlands - CBD)"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Phone Number</FormLabel>
                <Input
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="Enter contact phone number"
                  isReadOnly={formData.phone_number !== ''}
                />
                {formData.phone_number && (
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    Using phone number from your profile
                  </Text>
                )}
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Budget (KES)</FormLabel>
                <NumberInput
                  name="budget"
                  value={formData.budget}
                  onChange={(value) => handleChange({ target: { name: 'budget', value } })}
                  min={PRICE_PER_TRIP}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Price per trip is fixed at KES {PRICE_PER_TRIP}
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Number of Trips (Auto-calculated)</FormLabel>
                <NumberInput
                  value={formData.trips_needed}
                  isReadOnly
                >
                  <NumberInputField />
                </NumberInput>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Based on your budget of KES {formData.budget}
                </Text>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Deadline</FormLabel>
                <Input
                  name="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={handleChange}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              type="submit"
              isLoading={loading}
              isDisabled={formData.trips_needed < 1}
            >
              Create Campaign
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
} 