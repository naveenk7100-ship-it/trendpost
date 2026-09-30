'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';

export const INITIAL_USERS: User[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'person.a@trendpost.local',
    name: 'Person A',
    role: 'admin',
    telegram_chat_id: '123456781',
    telegram_enabled: true,
    created_at: '2026-09-29T00:00:00Z',
    updated_at: '2026-09-29T00:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    email: 'person.b@trendpost.local',
    name: 'Person B',
    role: 'member',
    telegram_chat_id: '123456782',
    telegram_enabled: true,
    created_at: '2026-09-29T00:00:00Z',
    updated_at: '2026-09-29T00:00:00Z',
  },
];

interface UserContextType {
  currentUser: User;
  users: User[];
  switchUser: (userId: string) => void;
}

const UserContext = createContext<UserContextType>({
  currentUser: INITIAL_USERS[0],
  users: INITIAL_USERS,
  switchUser: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);

  useEffect(() => {
    const savedUserId = localStorage.getItem('trendpost_active_user');
    if (savedUserId) {
      const found = INITIAL_USERS.find(u => u.id === savedUserId);
      if (found) setCurrentUser(found);
    }
  }, []);

  const switchUser = (userId: string) => {
    const found = INITIAL_USERS.find(u => u.id === userId);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('trendpost_active_user', found.id);
    }
  };

  return (
    <UserContext.Provider value={{ currentUser, users: INITIAL_USERS, switchUser }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
