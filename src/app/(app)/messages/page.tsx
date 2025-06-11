'use client';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Search, UserCircle } from "lucide-react";
import type { Conversation, Message } from '@/lib/types';
import { cn } from '@/lib/utils';

// Mock data
const mockConversations: Conversation[] = [
  { 
    id: 'conv1', 
    participantIds: ['user1', 'user2'], 
    lastMessage: { id: 'msg1', conversationId: 'conv1', senderId: 'user2', receiverId: 'user1', content: "Is the plot available next month?", timestamp: new Date(Date.now() - 3600000), isRead: false },
    listingId: 'listing123'
  },
  { 
    id: 'conv2', 
    participantIds: ['user1', 'user3'], 
    lastMessage: { id: 'msg2', conversationId: 'conv2', senderId: 'user1', receiverId: 'user3', content: "Yes, it's available. Feel free to book.", timestamp: new Date(Date.now() - 86400000), isRead: true }
  },
  { 
    id: 'conv3', 
    participantIds: ['user1', 'user4'], 
    lastMessage: { id: 'msg3', conversationId: 'conv3', senderId: 'user4', receiverId: 'user1', content: "What are the exact dimensions?", timestamp: new Date(Date.now() - 172800000), isRead: true }
  },
];

const mockMessages: { [key: string]: Message[] } = {
  conv1: [
    { id: 'msgA', conversationId: 'conv1', senderId: 'user2', receiverId: 'user1', content: "Hi there! Interested in your Sunny Meadow Plot.", timestamp: new Date(Date.now() - 7200000), isRead: true },
    { id: 'msg1', conversationId: 'conv1', senderId: 'user2', receiverId: 'user1', content: "Is the plot available next month?", timestamp: new Date(Date.now() - 3600000), isRead: false },
  ],
  conv2: [
    { id: 'msgB', conversationId: 'conv2', senderId: 'user3', receiverId: 'user1', content: "Enquiring about Forest Retreat Lot.", timestamp: new Date(Date.now() - 90000000), isRead: true },
    { id: 'msg2', conversationId: 'conv2', senderId: 'user1', receiverId: 'user3', content: "Yes, it's available. Feel free to book.", timestamp: new Date(Date.now() - 86400000), isRead: true },
  ],
   conv3: [
    { id: 'msgC', conversationId: 'conv3', senderId: 'user4', receiverId: 'user1', content: "What are the exact dimensions?", timestamp: new Date(Date.now() - 172800000), isRead: true },
  ],
};

// Mock current user ID
const currentUserId = 'user1';

// Mock participant names (in a real app, fetch this)
const participantNames: { [key: string]: string } = {
  user1: "You",
  user2: "John Doe",
  user3: "Jane Smith",
  user4: "Robert Paulson"
};

export default function MessagesPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(mockConversations[0]?.id || null);
  const [newMessage, setNewMessage] = useState('');

  const selectedConversation = mockConversations.find(c => c.id === selectedConversationId);
  const messagesToDisplay = selectedConversationId ? mockMessages[selectedConversationId] || [] : [];

  const getOtherParticipantName = (conv: Conversation) => {
    const otherId = conv.participantIds.find(id => id !== currentUserId);
    return otherId ? participantNames[otherId] || "Unknown User" : "Unknown User";
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversationId) return;
    // Simulate sending message
    console.log(`Sending message: "${newMessage}" to conversation ${selectedConversationId}`);
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: selectedConversationId,
      senderId: currentUserId,
      receiverId: selectedConversation?.participantIds.find(id => id !== currentUserId) || '',
      content: newMessage,
      timestamp: new Date(),
      isRead: false,
    };
    mockMessages[selectedConversationId] = [...(mockMessages[selectedConversationId] || []), newMsg];
    // Update last message for the conversation list (simplified)
    const convIndex = mockConversations.findIndex(c => c.id === selectedConversationId);
    if (convIndex !== -1) {
      mockConversations[convIndex].lastMessage = newMsg;
    }
    setNewMessage('');
    // In a real app, you'd re-fetch or update state from a central store
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] border rounded-lg shadow-lg overflow-hidden">
      {/* Conversations List */}
      <div className="w-1/3 border-r bg-card">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Chats</h2>
          <div className="relative mt-2">
            <Input placeholder="Search conversations..." className="pr-10" />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <ScrollArea className="h-[calc(100%-8rem)]">
          {mockConversations.map(conv => (
            <div
              key={conv.id}
              className={cn(
                "p-4 border-b cursor-pointer hover:bg-muted/50",
                selectedConversationId === conv.id && "bg-muted"
              )}
              onClick={() => setSelectedConversationId(conv.id)}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`https://placehold.co/40x40.png?text=${getOtherParticipantName(conv).charAt(0)}`} />
                  <AvatarFallback>{getOtherParticipantName(conv).substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <h3 className={cn("font-semibold truncate", !conv.lastMessage?.isRead && conv.lastMessage?.receiverId === currentUserId && "text-primary")}>
                    {getOtherParticipantName(conv)}
                  </h3>
                  <p className={cn("text-xs text-muted-foreground truncate", !conv.lastMessage?.isRead && conv.lastMessage?.receiverId === currentUserId && "font-medium")}>
                    {conv.lastMessage?.content}
                  </p>
                </div>
                {!conv.lastMessage?.isRead && conv.lastMessage?.receiverId === currentUserId && (
                    <div className="w-2 h-2 bg-accent rounded-full self-start mt-1"></div>
                )}
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Message View */}
      <div className="w-2/3 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b bg-card flex items-center gap-3">
               <Avatar className="h-10 w-10">
                  <AvatarImage src={`https://placehold.co/40x40.png?text=${getOtherParticipantName(selectedConversation).charAt(0)}`} />
                  <AvatarFallback>{getOtherParticipantName(selectedConversation).substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              <div>
                <h2 className="text-lg font-semibold">{getOtherParticipantName(selectedConversation)}</h2>
                {selectedConversation.listingId && <p className="text-xs text-muted-foreground">Regarding listing: {selectedConversation.listingId}</p>}
              </div>
            </div>
            <ScrollArea className="flex-1 p-4 space-y-4 bg-background">
              {messagesToDisplay.map(msg => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.senderId === currentUserId ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-xs lg:max-w-md p-3 rounded-lg shadow",
                      msg.senderId === currentUserId
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border"
                    )}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs mt-1 opacity-70 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </ScrollArea>
            <form onSubmit={handleSendMessage} className="p-4 border-t bg-card flex items-center gap-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-background">
            <UserCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground">Select a conversation</h2>
            <p className="text-sm text-muted-foreground">Choose a chat from the list to view messages.</p>
          </div>
        )}
      </div>
    </div>
  );
}
