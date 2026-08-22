import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import QuestionnaireScreen from './src/screens/QuestionnaireScreen';
import ResultScreen from './src/screens/ResultScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';

const Stack = createNativeStackNavigator();

export default function App() {
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      let token;
      try {
        token = await AsyncStorage.getItem('token');
        if (token) {
          try {
            // Safe JWT decode in React Native without atob dependency
            const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
            let str = '';
            for (let i = 0; i < base64.length; i += 4) {
              const b1 = chars.indexOf(base64[i]), b2 = chars.indexOf(base64[i+1]), b3 = chars.indexOf(base64[i+2]), b4 = chars.indexOf(base64[i+3]);
              if (b1 >= 0 && b2 >= 0) str += String.fromCharCode((b1 << 2) | (b2 >> 4));
              if (b3 >= 0 && b3 !== 64) str += String.fromCharCode(((b2 & 15) << 4) | (b3 >> 2));
              if (b4 >= 0 && b4 !== 64) str += String.fromCharCode(((b3 & 3) << 6) | b4);
            }
            const payload = JSON.parse(str);
            if (payload?.name) {
              const storedUser = await AsyncStorage.getItem('user');
              const user = storedUser ? JSON.parse(storedUser) : {};
              const updatedUser = { ...user, name: payload.name, email: payload.email, _id: payload.id, isAdmin: payload.isAdmin };
              await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            }
          } catch (jwtErr) {
            // Ignore JWT decode errors
          }
        }
      } catch (e) {
        // Restoring token failed
      }
      setUserToken(token);
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  const authContext = React.useMemo(
    () => ({
      signIn: async (data) => {
        await AsyncStorage.setItem('token', data.token);
        if (data.user) {
           await AsyncStorage.setItem('user', JSON.stringify(data.user));
        }
        setUserToken(data.token);
      },
      updateUser: async (data) => {
        if (data.token) {
          await AsyncStorage.setItem('token', data.token);
          setUserToken(data.token);
        }
        if (data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
        }
      },
      signOut: async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        setUserToken(null);
      },
      userToken: userToken
    }),
    [userToken]
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthContext.Provider value={authContext}>
        <ThemeProvider>
          <NavigationContainer>
            <Stack.Navigator>
              {userToken == null ? (
                <Stack.Screen 
                  name="Auth" 
                  component={AuthScreen}
                  options={{ headerShown: false }}
                />
              ) : (
                <Stack.Group screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="Dashboard" component={DashboardScreen} />
                  <Stack.Screen name="Questionnaire" component={QuestionnaireScreen} />
                  <Stack.Screen name="Result" component={ResultScreen} />
                  <Stack.Screen name="History" component={HistoryScreen} />
                  <Stack.Screen name="Settings" component={SettingsScreen} />
                </Stack.Group>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </ThemeProvider>
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
}
