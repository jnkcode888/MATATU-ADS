import { useState, useEffect } from 'react';
import { Box, IconButton, useBreakpointValue } from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import Image from 'next/image';

{item.type === 'video' ? (
  <video
    src={item.url}
    autoPlay
    loop
    muted
    playsInline
    style={{
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: 'center',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}
  />
) : (
  <Image
    src={item.url}
    alt={item.alt || 'Carousel image'}
    layout="fill"
    objectFit="cover"
    objectPosition="center"
    priority={index === 0}
  />
)} 