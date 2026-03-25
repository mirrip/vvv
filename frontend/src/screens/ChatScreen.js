import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { socket } from '../utils/socket';
import MessageBubble from '../components/MessageBubble';

export default function ChatScreen({ route, navigation }) {
  const { chat } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef();

  useEffect(() => {
    fetchMessages();
    
    socket.on('new_message', (msg) => {
      if (msg.chat_id === chat.id) {
        setMessages(prev => [...prev, msg]);
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

    socket.on('typing', ({ userId }) => {});

    socket.on('stop_typing', ({ userId }) => {});

    socket.on('reaction_update', ({ messageId, userId, reaction }) => {
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          const existing = m.reactions?.find(r => r.user_id === userId);
          if (existing) {
            existing.reaction = reaction;
          } else {
            m.reactions = [...(m.reactions || []), { user_id: userId, reaction }];
          }
        }
        return m;
      }));
    });

    return () => {
      socket.off('new_message');
      socket.off('message_updated');
      socket.off('message_deleted');
      socket.off('typing');
      socket.off('stop_typing');
      socket.off('reaction_update');
    };
  }, [chat.id]);

  useEffect(() => {
    navigation.setOptions({ title: chat.title });
  }, [chat.title]);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/chats/${chat.id}/messages`);
      setMessages(res.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await api.post(`/messages/${messageId}/read`, { userId: user.id });
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

      await api.post('/messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setInputText('');
      setSelectedFiles([]);
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się wysłać wiadomości');
    }
  };

  const handleTyping = () => {
    socket.emit('typing', { chatId: chat.id, userId: user.id });
  };

  const handleStopTyping = () => {
    socket.emit('stop_typing', { chatId: chat.id, userId: user.id });
  };

  const handleReaction = async (messageId, reaction) => {
    try {
      await api.post(`/messages/${messageId}/reactions`, {
        userId: user.id,
        reaction
      });
      setShowReactionPicker(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLongPress = (message) => {
    setSelectedMessage(message);
    setShowReactionPicker(true);
  };

  const reactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#AA00FF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <MessageBubble 
            message={item} 
            userId={user.id}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        contentContainerStyle={styles.messageList}
      />

      {showReactionPicker && (
        <View style={styles.reactionPicker}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {reactions.map((r, i) => (
              <TouchableOpacity 
                key={i} 
                style={styles.reactionButton}
                onPress={() => handleReaction(selectedMessage?.id, r)}
              >
                <Text style={styles.reactionText}>{r}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowReactionPicker(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={() => Alert.alert('Informacja', 'Wyślij plik będzie dostępne wkrótce')}>
          <Text style={styles.attachButton}>📎</Text>
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Wiadomość..."
          placeholderTextColor="#aaa"
          onFocus={handleTyping}
          onBlur={handleStopTyping}
        />

        {inputText.length === 0 ? (
          <TouchableOpacity onPress={() => Alert.alert('Informacja', 'Nagrywanie będzie dostępne wkrótce')}>
            <Text style={styles.actionButton}>🎤</Text>
          </TouchableOpacity>
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
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  messageList: { paddingVertical: 10 },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 10, 
    borderTopWidth: 1, 
    borderTopColor: '#1a1a1a',
    backgroundColor: '#000'
  },
  attachButton: { fontSize: 24, marginHorizontal: 10 },
  input: { 
    flex: 1, 
    backgroundColor: '#1a1a1a', 
    color: '#fff', 
    padding: 10, 
    borderRadius: 20,
    marginHorizontal: 10
  },
  actionButton: { fontSize: 24, marginHorizontal: 10 },
  sendButton: { fontSize: 24, marginHorizontal: 10, color: '#AA00FF' },
  reactionPicker: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333'
  },
  reactionButton: { padding: 10, marginHorizontal: 5 },
  reactionText: { fontSize: 24 },
  closeButton: { fontSize: 20, padding: 10, color: '#aaa' }
});