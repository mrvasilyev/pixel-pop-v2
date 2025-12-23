import { useInfiniteQuery } from '@tanstack/react-query';
import { login } from '../api/client';

const fetchGallery = async ({ pageParam = null }) => {
  const token = await login();
  
  const url = new URL('/api/gallery', window.location.origin);
  url.searchParams.set('limit', 20);
  if (pageParam) {
    url.searchParams.set('cursor', pageParam);
  }

  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) {
     throw new Error('Gallery fetch failed');
  }
  return res.json();
};

export const useGallery = () => {
  return useInfiniteQuery({
    queryKey: ['gallery'],
    queryFn: fetchGallery,
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined, // undefined stops recursion
    initialPageParam: null,
  });
};
