import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@chakra-ui/react';
import { supabase } from '../lib/supabase';

export default function CompleteRegistration() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    role: '',
    phone: '',
  });

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        toast({
          title: 'Session expired',
          description: 'Please sign in again',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        router.push('/register');
      } else {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role, user_type, registration_complete')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          toast({
            title: 'Error',
            description: 'Failed to fetch user profile. Please try again.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          router.push('/register');
          return;
        }

        if (profile?.role && profile?.user_type && profile?.registration_complete === true) {
          redirectBasedOnRole(profile.user_type);
        } else {
          setFormData((prev) => ({
            ...prev,
            role: profile?.user_type || '',
          }));
        }
      }
    };
    checkSession();
  }, [router, toast]);

  const redirectBasedOnRole = (userType) => {
    let path = '/dashboard';
    switch (userType) {
      case 'admin':
        path = '/admin';
        break;
      case 'freelancer':
        path = '/freelancer/profile';
        break;
      case 'business':
        path = '/business/dashboard';
        break;
      default:
        path = '/dashboard';
    }
    console.log('Redirecting to:', path);
    router.push(path);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        throw new Error('Session expired. Please sign in again.');
      }

      console.log('Updating user with:', {
        role: formData.role,
        user_type: formData.role,
        phone_number: formData.phone,
        registration_complete: true,
      });

      const { error: updateError } = await supabase
        .from('users')
        .update({
          role: formData.role,
          user_type: formData.role,
          phone_number: formData.phone,
          registration_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (updateError) {
        if (updateError.message.includes('column "registration_complete" does not exist')) {
          // Fallback: Update without registration_complete if the column doesn't exist
          console.log('registration_complete column not found, updating without it');
          const { error: fallbackUpdateError } = await supabase
            .from('users')
            .update({
              role: formData.role,
              user_type: formData.role,
              phone_number: formData.phone,
              updated_at: new Date().toISOString(),
            })
            .eq('id', session.user.id);

          if (fallbackUpdateError) throw fallbackUpdateError;
        } else {
          throw updateError;
        }
      }

      toast({
        title: 'Registration complete!',
        description: 'Redirecting to your dashboard...',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setTimeout(() => {
        redirectBasedOnRole(formData.role);
      }, 2000);
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message);
      toast({
        title: 'Error completing registration',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Complete Your Registration
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please provide additional information to complete your registration
        </p>
        <div className="mt-4 bg-blue-50 p-3 rounded-lg text-center">
          <p className="text-blue-800 text-sm">
            You’re almost done! Just a few more details needed.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Account Type
              </label>
              <select
                id="role"
                name="role"
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">Select account type</option>
                <option value="business">Business Owner</option>
                <option value="freelancer">Freelancer</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="+254 712 345678"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Completing registration...' : 'Complete Registration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}