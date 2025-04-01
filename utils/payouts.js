import { getDbInstance } from '../lib/auth';
import { useToast } from '@chakra-ui/react';

export const usePayouts = () => {
  const toast = useToast();
  
  const handlePayout = async (selectedGig, paymentAmount, phoneNumber, setLoading, setSelectedGig, setPaymentAmount, setPhoneNumber) => {
    if (!selectedGig || !paymentAmount || !phoneNumber) {
      toast({
        title: "Missing information",
        description: "Please fill in all payout fields",
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
        .from('payments')
        .insert([{ 
          gig_id: selectedGig, 
          amount: parseFloat(paymentAmount),
          phone: phoneNumber,
          status: 'completed' 
        }]);
        
      if (error) throw error;
      
      toast({
        title: "Payout successful",
        description: "The payment has been processed",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      setSelectedGig('');
      setPaymentAmount('');
      setPhoneNumber('');
    } catch (error) {
      toast({
        title: "Payout failed",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return { handlePayout };
};