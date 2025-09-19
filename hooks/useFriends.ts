import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  sender_username?: string;
  receiver_username?: string;
}

export interface Friend {
  id: string;
  username: string;
  avatar_url: string | null;
  weekly_minutes: number;
  current_streak: number;
}

export interface UserSearchResult {
  id: string;
  username: string;
  avatar_url: string | null;
  is_friend: boolean;
  request_status: 'none' | 'pending' | 'accepted' | 'declined';
}

export function useFriends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);
  const { user } = useAuth();
  const { profile } = useProfile();

  useEffect(() => {
    isMounted.current = true;
    if (user) {
      // Stagger loading to prevent blocking
      const timer1 = setTimeout(() => {
        loadFriends();
      }, 200);
      const timer2 = setTimeout(() => {
        loadFriendRequests();
      }, 300);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        isMounted.current = false;
      };
    } else {
      if (isMounted.current) {
        setFriends([]);
        setFriendRequests([]);
        setIsLoading(false);
      }
    }
    return () => {
      isMounted.current = false;
    };
  }, [user]);

  const loadFriends = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('get_user_friends_with_stats');
      
      if (error) throw error;
      if (isMounted.current) {
        setFriends(data || []);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadFriendRequests = async () => {
    if (!user) return;
    
    try {
      if (isMounted.current) {
        setIsLoading(true);
      }
      
      // Get friend requests with usernames using the original working query
      const { data: requestsData, error: requestsError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:sender_id(username),
          receiver:receiver_id(username)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Map the requests with the joined username data
      const requests: FriendRequest[] = (requestsData || []).map(req => {
        console.log('Raw friend request data:', req);
        
        return {
          id: req.id,
          sender_id: req.sender_id,
          receiver_id: req.receiver_id,
          status: req.status,
          created_at: req.created_at,
          sender_username: (req.sender as any)?.username || 'Unknown',
          receiver_username: (req.receiver as any)?.username || 'You',
        };
      });
      
      if (isMounted.current) {
        setFriendRequests(requests);
      }
    } catch (error) {
      console.error('Error loading friend requests:', error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const searchUsers = async (searchTerm: string): Promise<UserSearchResult[]> => {
    if (!user || !searchTerm.trim()) return [];
    
    try {
      const { data, error } = await supabase.rpc('search_users_by_username', {
        search_term: searchTerm.trim()
      });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending'
        });

      if (error) throw error;
      await loadFriendRequests();
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw new Error('Failed to send friend request');
    }
  };

  const respondToFriendRequest = async (requestId: string, response: 'accepted' | 'declined') => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Update the friend request status
      const { data: requestData, error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: response })
        .eq('id', requestId)
        .eq('receiver_id', user.id)
        .select('sender_id')
        .single();

      if (updateError) throw updateError;

      // If accepted, create friendship
      if (response === 'accepted' && requestData) {
        const user1Id = user.id < requestData.sender_id ? user.id : requestData.sender_id;
        const user2Id = user.id > requestData.sender_id ? user.id : requestData.sender_id;

        const { error: friendshipError } = await supabase
          .from('friendships')
          .insert({
            user1_id: user1Id,
            user2_id: user2Id
          });

        if (friendshipError) throw friendshipError;
        await loadFriends();
      }

      await loadFriendRequests();
    } catch (error) {
      console.error('Error responding to friend request:', error);
      throw new Error('Failed to respond to friend request');
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const user1Id = user.id < friendId ? user.id : friendId;
      const user2Id = user.id > friendId ? user.id : friendId;

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user1_id', user1Id)
        .eq('user2_id', user2Id);

      if (error) throw error;
      await loadFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
      throw new Error('Failed to remove friend');
    }
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (!username.trim()) return false;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', username.trim())
        .neq('id', user?.id || '');

      if (error) throw error;
      return data.length === 0;
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  };

  return {
    friends,
    friendRequests,
    isLoading,
    searchUsers,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    checkUsernameAvailability,
    refreshFriends: loadFriends,
    refreshFriendRequests: loadFriendRequests,
  };
}