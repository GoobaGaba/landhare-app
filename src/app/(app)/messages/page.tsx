
'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Send, Search, UserCircle, Loader2 } from "lucide-react";
import type { Conversation, Message, User as AppUserType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { isPrototypeMode } from '@/lib/firebase';
import { getConversationsForUser, getMessagesForConversation, sendMessage, getUserById } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PopulatedConversation extends Conversation {
    otherParticipant?: AppUserType;
    listingTitle?: string;
}

function MessagesComponent() {
    const { currentUser, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    const [conversations, setConversations] = useState<PopulatedConversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<PopulatedConversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    // Fetch all conversations for the current user
    useEffect(() => {
        if (!currentUser) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        getConversationsForUser(currentUser.uid)
            .then(convos => {
                setConversations(convos);
                const conversationIdFromUrl = searchParams.get('conversationId');
                if (conversationIdFromUrl) {
                    const matchingConvo = convos.find(c => c.id === conversationIdFromUrl);
                    if (matchingConvo) {
                        setSelectedConversation(matchingConvo);
                    }
                } else if (convos.length > 0) {
                    setSelectedConversation(convos[0]);
                }
            })
            .catch(error => toast({ title: "Error", description: `Could not load conversations: ${error.message}`, variant: "destructive" }))
            .finally(() => setIsLoading(false));

    }, [currentUser, searchParams, toast]);

    // Set up a real-time listener for messages when a conversation is selected
    useEffect(() => {
        if (!selectedConversation) {
            setMessages([]);
            return;
        }

        const unsubscribe = getMessagesForConversation(selectedConversation.id, (newMessages) => {
            setMessages(newMessages);
        });

        // Cleanup the listener when the component unmounts or the conversation changes
        return () => unsubscribe();

    }, [selectedConversation]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversation || !currentUser) return;

        setIsSending(true);
        try {
            await sendMessage(
                selectedConversation.id,
                currentUser.uid,
                selectedConversation.otherParticipant!.id,
                newMessage,
                selectedConversation.listingId
            );
            setNewMessage('');
        } catch (error: any) {
            toast({ title: "Error", description: `Failed to send message: ${error.message}`, variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };
    
    if (authLoading || isLoading) {
         return (
            <div className="flex justify-center items-center h-[calc(100vh-12rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading Messages...</p>
            </div>
        );
    }
    
    if (!currentUser && !authLoading) {
         return (
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><UserCircle className="h-6 w-6 text-primary" />Please Log In</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">You need to be logged in to view your messages.</p><Button asChild className="mt-4"><Link href="/login">Log In</Link></Button></CardContent>
            </Card>
        );
    }

    return (
        <div className="flex h-[calc(100vh-12rem)] border rounded-lg shadow-lg overflow-hidden">
            {/* Conversations List */}
            <div className="w-1/3 border-r bg-card">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-semibold">Chats</h2>
                    <div className="relative mt-2">
                        <Input placeholder="Search conversations..." className="pr-10" disabled/>
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
                <ScrollArea className="h-[calc(100%-8rem)]">
                    {conversations.length > 0 ? conversations.map(conv => (
                        <div
                            key={conv.id}
                            className={cn(
                                "p-4 border-b cursor-pointer hover:bg-muted/50",
                                selectedConversation?.id === conv.id && "bg-muted"
                            )}
                            onClick={() => setSelectedConversation(conv)}
                        >
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={conv.otherParticipant?.avatarUrl || `https://placehold.co/40x40.png`} data-ai-hint="person initial" />
                                    <AvatarFallback>{conv.otherParticipant?.name?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <h3 className={cn("font-semibold truncate", !conv.lastMessage?.isRead && conv.lastMessage?.receiverId === currentUser.uid && "text-primary")}>
                                        {conv.otherParticipant?.name || "Unknown User"}
                                    </h3>
                                    <p className={cn("text-xs text-muted-foreground truncate", !conv.lastMessage?.isRead && conv.lastMessage?.receiverId === currentUser.uid && "font-medium")}>
                                        {conv.lastMessage?.content}
                                    </p>
                                </div>
                                {!conv.lastMessage?.isRead && conv.lastMessage?.receiverId === currentUser.uid && (
                                    <div className="w-2 h-2 bg-accent rounded-full self-start mt-1"></div>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">No conversations yet.</div>
                    )}
                </ScrollArea>
            </div>

            {/* Message View */}
            <div className="w-2/3 flex flex-col">
                {selectedConversation ? (
                    <>
                        <div className="p-4 border-b bg-card flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={selectedConversation.otherParticipant?.avatarUrl} data-ai-hint="person initial" />
                                <AvatarFallback>{selectedConversation.otherParticipant?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="text-lg font-semibold">{selectedConversation.otherParticipant?.name}</h2>
                                {selectedConversation.listingTitle && <p className="text-xs text-muted-foreground">Regarding listing: {selectedConversation.listingTitle}</p>}
                            </div>
                        </div>
                        <ScrollArea className="flex-1 p-4 space-y-4 bg-background">
                            {messages.map(msg => {
                                const msgDate = msg.timestamp instanceof Date ? msg.timestamp : (msg.timestamp as any).toDate();
                                return (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex",
                                        msg.senderId === currentUser.uid ? "justify-end" : "justify-start"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "max-w-xs lg:max-w-md p-3 rounded-lg shadow",
                                            msg.senderId === currentUser.uid
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-card border"
                                        )}
                                    >
                                        <p className="text-sm">{msg.content}</p>
                                        <p className="text-xs mt-1 opacity-70 text-right">
                                            {format(msgDate, 'p')}
                                        </p>
                                    </div>
                                </div>
                            )})}
                        </ScrollArea>
                        <form onSubmit={handleSendMessage} className="p-4 border-t bg-card flex items-center gap-2">
                            <Input
                                placeholder="Type your message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="flex-1"
                                disabled={isSending}
                            />
                            <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending}>
                                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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

function LoadingFallback() {
    return (
        <div className="flex justify-center items-center h-[calc(100vh-12rem)]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading Messages...</p>
        </div>
    );
}


export default function MessagesPage() {
    return (
        <Suspense fallback={<LoadingFallback/>}>
            <MessagesComponent />
        </Suspense>
    )
}
