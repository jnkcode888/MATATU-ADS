import { getDbInstance } from '../lib/auth';
import { useToast } from '@chakra-ui/react';

export const useAssignGig = (fetchGigs) => {
  const toast = useToast();
  
  const handleAssignGig = async (selectedFreelancer, selectedCampaign, setLoading) => {
    if (!selectedFreelancer || !selectedCampaign) {
      toast({
        title: "Missing information",
        description: "Please select both a freelancer and a campaign",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setLoading(true);
      const supabase = getDbInstance();
      
      const { data, error } = await supabase
        .from('gigs')
        .insert([{ 
          campaign_id: selectedCampaign, 
          freelancer_id: selectedFreelancer, 
          status: 'assigned' 
        }]);
        
      if (error) throw error;
      
      toast({
        title: "Assignment successful",
        description: "The gig has been assigned to the freelancer",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      fetchGigs(supabase);
    } catch (error) {
      toast({
        title: "Assignment failed",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return { handleAssignGig };
};