import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setServerUrl } from '../store/slices/connectionSlice';
import config from '../config';

interface ConnectionConfigProps {
  onClose: () => void;
}

export const ConnectionConfig: React.FC<ConnectionConfigProps> = ({ onClose }) => {
  const dispatch = useAppDispatch();
  const currentUrl = useAppSelector((state: any) => state.connection.serverUrl);
  const [url, setUrl] = useState(currentUrl || config.websocketUrl);

  const handleSave = () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a valid WebSocket URL');
      return;
    }

    // Validate URL format
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'ws:' && urlObj.protocol !== 'wss:') {
        throw new Error('Must be a WebSocket URL (ws:// or wss://)');
      }
    } catch (error) {
      Alert.alert('Error', 'Invalid URL format. Please use ws://host:port format');
      return;
    }

    dispatch(setServerUrl(url));
    Alert.alert('Success', 'WebSocket URL updated successfully!');
    onClose();
  };

  const getLocalNetworkExample = () => {
    // Try to extract host from current URL for example
    try {
      const currentHost = new URL(config.websocketUrl).hostname;
      if (currentHost !== 'localhost') {
        return `ws://${currentHost}:8080`;
      }
    } catch (e) {
      // Ignore
    }
    return 'ws://192.168.1.100:8080';
  };

  return (
    <View style={styles.container}>
      <View style={styles.modal}>
        <Text style={styles.title}>WebSocket Configuration</Text>
        
        <Text style={styles.description}>
          Configure the WebSocket URL to connect to your backend services.
          Current: {currentUrl}
        </Text>

        <Text style={styles.label}>WebSocket URL:</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="ws://192.168.1.100:8080"
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.hint}>
          Example: {getLocalNetworkExample()}
          {'\n\n'}
          To find your IP address:
          {'\n'}• Windows: ipconfig
          {'\n'}• Mac/Linux: ifconfig
          {'\n'}• Look for your local network IP (usually 192.168.x.x or 10.x.x.x)
          {'\n\n'}
          You can also update the .env file with EXPO_PUBLIC_WEBSOCKET_HOST
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 20,
    margin: 20,
    minWidth: 300,
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#3a3a3a',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#555',
  },
  hint: {
    color: '#999',
    fontSize: 12,
    marginBottom: 20,
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#555',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
