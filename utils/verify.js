import { getDbInstance } from '../lib/auth';
import { useToast } from '@chakra-ui/react';

export const useVerifyGig = (fetchGigs) => {
  const toast = useToast();
  
  const handleVerifyGig = async (gig_id, status, setLoading) => {
    try {
      setLoading(true);
      const supabase = getDbInstance();
      
      const { data, error } = await supabase
        .from('gigs')
        .update({ status })
        .eq('id', gig_id);
        
      if (error) throw error;
      
      toast({
        title: status === 'verified' ? "Gig verified" : "Gig rejected",
        description: `The gig has been ${status}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      fetchGigs(supabase);
    } catch (error) {
      toast({
        title: "Action failed",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return { handleVerifyGig };
};