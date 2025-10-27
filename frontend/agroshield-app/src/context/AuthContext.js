import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  getCurrentUser, 
  getCurrentSession,
  loginUser as authLogin, 
  registerUser as authRegister, 
  logoutUser as authLogout,
  onAuthStateChange,
  updateUserProfile as authUpdateProfile,
  resetPassword as authResetPassword,
  updatePassword as authUpdatePassword,
  refreshSession as authRefreshSession,
} from '../services/supabase';
import locationService from '../services/locationService';
import { locationAPI } from '../services/api';

// Create Auth Context
const AuthContext = createContext({
  user: null,
  profile: null,
  session: null,
  loading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
  refreshSession: async () => {},
});

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize authentication state
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // Get current session
        const { session: currentSession } = await getCurrentSession();
        setSession(currentSession);

        // Get current user if session exists
        if (currentSession) {
          const { user: currentUser, profile: currentProfile } = await getCurrentUser();
          setUser(currentUser);
          setProfile(currentProfile);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: authListener } = onAuthStateChange(async (event, newSession) => {
      console.log('Auth event:', event);
      
      setSession(newSession);

      if (newSession) {
        // User signed in or session refreshed
        const { user: newUser, profile: newProfile } = await getCurrentUser();
        setUser(newUser);
        setProfile(newProfile);
      } else {
        // User signed out
        setUser(null);
        setProfile(null);
      }

      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const { user: loggedInUser, session: newSession, error: loginError } = await authLogin(email, password);

      if (loginError) {
        setError(loginError);
        return { success: false, error: loginError };
      }

      setUser(loggedInUser);
      setSession(newSession);

      // Fetch profile
      const { user: currentUser, profile: currentProfile } = await getCurrentUser();
      setProfile(currentProfile);

      // Automatically track location on login (for farmers)
      if (currentProfile?.user_type === 'farmer') {
        try {
          await initializeLocationTracking(loggedInUser.id);
        } catch (locError) {
          console.warn('Location tracking error (non-blocking):', locError);
          // Don't fail login if location tracking fails
        }
      }

      return { success: true, user: loggedInUser, profile: currentProfile };
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Initialize location tracking
  const initializeLocationTracking = async (userId) => {
    try {
      // Request permissions
      const hasPermission = await locationService.hasPermissions();
      if (!hasPermission) {
        const permissions = await locationService.requestPermissions();
        if (!permissions.foreground) {
          console.log('Location permission not granted');
          return;
        }
      }

      // Get current location
      const location = await locationService.getCurrentLocation();

      // Update location on server
      if (location && userId) {
        await locationAPI.updateLocation(userId, {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          altitude: location.altitude,
        });
        
        console.log('Location updated on login:', location);
      }

      // Start continuous tracking
      await locationService.startWatching(async (newLocation) => {
        try {
          await locationAPI.updateLocation(userId, {
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
            accuracy: newLocation.accuracy,
            altitude: newLocation.altitude,
          });
        } catch (error) {
          console.error('Location update error:', error);
        }
      });

    } catch (error) {
      console.error('Initialize location tracking error:', error);
      throw error;
    }
  };

  // Register function
  const register = async (email, password, userType, profileData = {}) => {
    try {
      setLoading(true);
      setError(null);

      const { user: newUser, session: newSession, error: registerError } = await authRegister(
        email, 
        password, 
        userType, 
        profileData
      );

      if (registerError) {
        setError(registerError);
        return { success: false, error: registerError };
      }

      setUser(newUser);
      setSession(newSession);

      // Fetch profile
      const { user: currentUser, profile: currentProfile } = await getCurrentUser();
      setProfile(currentProfile);

      return { success: true, user: newUser, profile: currentProfile };
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);

      // Stop location tracking
      locationService.stopWatching();
      await locationService.clearLocation();

      const { error: logoutError } = await authLogout();

      if (logoutError) {
        setError(logoutError);
        return { success: false, error: logoutError };
      }

      setUser(null);
      setProfile(null);
      setSession(null);

      return { success: true };
    } catch (err) {
      console.error('Logout error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Update profile function
  const updateProfile = async (updates) => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        return { success: false, error: 'No user logged in' };
      }

      const { profile: updatedProfile, error: updateError } = await authUpdateProfile(user.id, updates);

      if (updateError) {
        setError(updateError);
        return { success: false, error: updateError };
      }

      setProfile(updatedProfile);

      return { success: true, profile: updatedProfile };
    } catch (err) {
      console.error('Update profile error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);

      const { error: resetError } = await authResetPassword(email);

      if (resetError) {
        setError(resetError);
        return { success: false, error: resetError };
      }

      return { success: true };
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Update password function
  const updatePassword = async (newPassword) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await authUpdatePassword(newPassword);

      if (updateError) {
        setError(updateError);
        return { success: false, error: updateError };
      }

      return { success: true };
    } catch (err) {
      console.error('Password update error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Refresh session function
  const refreshSession = async () => {
    try {
      const { session: newSession, error: refreshError } = await authRefreshSession();

      if (refreshError) {
        setError(refreshError);
        return { success: false, error: refreshError };
      }

      setSession(newSession);

      return { success: true, session: newSession };
    } catch (err) {
      console.error('Session refresh error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Context value
  const value = {
    user,
    profile,
    session,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    resetPassword,
    updatePassword,
    refreshSession,
    isAuthenticated: !!user,
    isFarmer: profile?.user_type === 'farmer',
    isBuyer: profile?.user_type === 'buyer',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;
