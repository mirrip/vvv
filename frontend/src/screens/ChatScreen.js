import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { socket } from '../utils/socket';
import MessageBubble from '../components/MessageBubble';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Camera } from 'expo-camera';

export default function ChatScreen({ route, navigation }) {
  const { chat } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState('voice'); // 'voice' or 'video'
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const flatListRef = useRef();

  useEffect(() => {
    fetchMessages();
    connectSocket(user.id);
    
    socket.on('new_message', (msg) => {
      if (msg.chat_id === chat.id) {
        setMessages(prev => [...prev, msg]);
        // Mark as read
        markAsRead(msg.id);
      }
    });

    socket.on('message_updated', (msg) => {
      if (msg.chat_id === chat.id) {
        setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
      }
    });

    socket.on('message_deleted', (messageId) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    socket.on('typing', ({ userId }) => {
      // Show typing indicator
    });

    return () => {
      socket.off('new_message');
      socket.off('message_updated');
      socket.off('message_deleted');
      socket.off('typing');
    };
  }, [chat.id]);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/chats/${chat.id}/messages`);
      setMessages(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() && selectedFiles.length === 0) return;

    try {
      const formData = new FormData();
      formData.append('chat_id', chat.id);
      formData.append('sender_id', user.id);
      formData.append('type', 'text');
      formData.append('content', inputText);

      selectedFiles.forEach((file, index) => {
        formData.append('files', {
          uri: file.uri,
          name: file.name || `file${index}`,
          type: file.type || 'application/octet-stream'
        });
      });

      const res = await api.post('/messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessages(prev => [...prev, res.data]);
      setInputText('');
      setSelectedFiles([]);
    } catch (error) {
      console.error(error);
      Alert.alert('Błąd', 'Nie udało się wysłać wiadomości');
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await api.post(`/messages/${messageId}/read`, {
        userId: user.id,
        chat_id: chat.id
      });
    } catch (error) {
      console.error(error);
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({});
    if (!result.canceled) {
      const file = result.assets[0];
      setSelectedFiles([...selectedFiles, {
        uri: file.uri,
        name: file.name,
        type: 'application/octet-stream'
      }]);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Brak uprawnień', 'Potrzebujemy dostępu do galerii');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true
    });
    if (!result.canceled) {
      const newFiles = result.assets.map(asset => ({
        uri: asset.uri,
        name: asset.fileName || 'image.jpg',
        type: asset.type || 'image/jpeg'
      }));
      setSelectedFiles([...selectedFiles, ...newFiles]);
    }
  };

  const startRecording = async () => {
    if (recordingMode === 'voice') {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
        setIsRecording(true);
      } catch (error) {
        console.error(error);
      }
    } else {
      // Video recording would require Camera component
      Alert.alert('Info', 'Nagrywanie wideo wymaga aparatu');
    }
  };

  const stopRecording = async () => {
    if (recording) {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      // Send voice message
      if (uri) {
        const formData = new FormData();
        formData.append('chat_id', chat.id);
        formData.append('sender_id', user.id);
        formData.append('type', 'voice');
        formData.append('content', 'Voice message');
        formData.append('files', {
          uri,
          name: 'voice.m4a',
          type: 'audio/m4a'
        });

        try {
          const res = await api.post('/messages', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          setMessages(prev => [...prev, res.data]);
        } catch (error) {
          console.error(error);
        }
      }
    }
  };

  const handleMessageLongPress = (message) => {
    setSelectedMessage(message);
    Alert.alert(
      'Wiadomość',
      '',
      [
        { text: 'Odpowiedz', onPress: () => {} },
        { text: 'Przekaż', onPress: () => {} },
        { text: 'Kopiuj', onPress: () => {} },
        { text: 'Usuń', onPress: () => deleteMessage(message.id), style: 'destructive' },
        { text: 'Anuluj', style: 'cancel' }
      ],
      { cancelable: true }
    );
  };

  const deleteMessage = async (messageId) => {
    try {
      await api.delete(`/messages/${messageId}`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error(error);
    }
  };

  const addReaction = async (messageId, reaction) => {
    try {
      await api.post(`/messages/${messageId}/reactions`, {
        userId: user.id,
        reaction,
        chat_id: chat.id
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.chatTitle}>{chat.title}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ProfileView', { userId: chat.id })}>
          <Text style={styles.infoButton}>ℹ</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <MessageBubble 
            message={item} 
            userId={user.id}
            onLongPress={() => handleMessageLongPress(item)}
            onReaction={(reaction) => addReaction(item.id, reaction)}
          />
        )}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />
      
      {selectedFiles.length > 0 && (
        <ScrollView horizontal style={styles.filesPreview}>
          {selectedFiles.map((file, index) => (
            <View key={index} style={styles.filePreview}>
              <Text style={styles.fileName}>{file.name}</Text>
              <TouchableOpacity onPress={() => {
                const newFiles = [...selectedFiles];
                newFiles.splice(index, 1);
                setSelectedFiles(newFiles);
              }}>
                <Text style={styles.removeFile}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
      
      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={pickImage}>
          <Text style={styles.attachButton}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Wiadomość..."
          placeholderTextColor="#aaa"
        />
        {inputText.length === 0 && selectedFiles.length === 0 ? (
          <>
            <TouchableOpacity 
              onPressIn={startRecording} 
              onPressOut={stopRecording}
              delayLongPress={500}
            >
              <Text style={styles.actionButton}>{recordingMode === 'voice' ? '🎤' : '📹'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRecordingMode(recordingMode === 'voice' ? 'video' : 'voice')}>
              <Text style={styles.actionButton}>🔄</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={sendMessage}>
            <Text style={styles.sendButton}>➤</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', paddingTop: 50 },
  backButton: { color: '#AA00FF', fontSize: 24 },
  chatTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  infoButton: { color: '#AA00FF', fontSize: 24 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  attachButton: { color: '#AA00FF', fontSize: 24, marginHorizontal: 10 },
  input: { flex: 1, backgroundColor: '#1a1a1a', color: '#fff', padding: 10, borderRadius: 20 },
  actionButton: { color: '#AA00FF', fontSize: 24, marginHorizontal: 10 },
  sendButton: { color: '#AA00FF', fontSize: 24, marginHorizontal: 10 },
  filesPreview: { maxHeight: 60, paddingHorizontal: 10, backgroundColor: '#1a1a1a' },
  filePreview: { marginRight: 10, backgroundColor: '#333', padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  fileName: { color: '#fff', marginRight: 5 },
  removeFile: { color: '#AA00FF' }
});