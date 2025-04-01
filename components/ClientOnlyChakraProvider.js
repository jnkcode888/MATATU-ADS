// components/ClientOnlyChakraProvider.js
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import theme from '../lib/theme';

export default function ClientOnlyChakraProvider({ children }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true); // Only render ChakraProvider after mount (client-side)
  }, []);

  if (!isMounted) {
    return <div suppressHydrationWarning />;
  }

  // Use the imported theme with ChakraProvider
  return (
    <div suppressHydrationWarning>
      <ChakraProvider theme={theme}>{children}</ChakraProvider>
    </div>
  );
}