import ChatLayout from '@/Layouts/ChatLayout';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useEffect, useState, useRef, useCallback } from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';
import ConversationHeader from '@/Components/App/ConversationHeader';
import MessageItem from '@/Components/App/MessageItem';
import MessageInput from '@/Components/App/MessageInput';
import { useEventBus } from '@/EventBus';
import axios from 'axios';

function Home({ selectedConversation = null, messages = null }) {
    const [localMessages, setLocalMessages] = useState([]);
    const [noMoreMessages, setNoMoreMessages] = useState(false);
    const [scrollFromBottom, setScrollFromBottom] = useState(0);
    const loadMoreIntersect = useRef(null);
    const messagesCtrRef = useRef(null);
    const { on } = useEventBus();

    const messageCreated = (message) => {
        if(selectedConversation &&
             selectedConversation.is_group 
             && selectedConversation.id == message.group_id
            ) { 
                setLocalMessages((prevMessages) => [...prevMessages, message]);
            }
            
        if(selectedConversation &&
            selectedConversation.is_user && 
            (selectedConversation.id == message.sender_id || 
                selectedConversation.id == message.receiver_id) 
           ) { 
               setLocalMessages((prevMessages) => [...prevMessages, message]);
           }
    };

    const loadMoreMessages = useCallback(() => {
        if(noMoreMessages) {
            return;
        }
        
        const firstMessage = localMessages[0];
        axios
            .get(route("message.loadOlder", firstMessage.id))
            .then(({ data }) => {
                if (data.data.length === 0) {
                    setNoMoreMessages(true);
                    return;
                }

                const scrollHeight = messagesCtrRef.current.scrollHeight;
                const scrollTop = messagesCtrRef.current.scrollTop;
                const clientHeight = messagesCtrRef.current.clientHeight;
                const tmpScrollFromBottom = 
                    scrollHeight - scrollTop - clientHeight;
                console.log("tmpScrollFromBottom", tmpScrollFromBottom);
                setScrollFromBottom(scrollHeight - scrollTop - clientHeight);

                setLocalMessages((prevMessages) => {
                   return [...data.data.reverse(), ...prevMessages]; 
                });
            });
    }, [localMessages, noMoreMessages]);
    
    useEffect(() => {
        setTimeout(() => {
            if (messagesCtrRef.current) { 
            messagesCtrRef.current.scrollTop =
             messagesCtrRef.current.scrollHeight;
            }
        }, 10);

        const offCreated = on('message.created', messageCreated);
        
        setScrollFromBottom(0);
        setNoMoreMessages(false);
        
        return () => {
            offCreated();
        }
    }, [selectedConversation]);

    useEffect(() => {
        setLocalMessages(messages ? messages.data.reverse() : []);
    }, [messages]);

    useEffect(() => {

        if (messagesCtrRef.current && scrollFromBottom !==null) {
            messagesCtrRef.current.scrollTop = 
                messagesCtrRef.current.scrollHeight - 
                messagesCtrRef.current.offsetHeight -
                scrollFromBottom;
        }
        
        if (noMoreMessages) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) =>
                entries.forEach(
                    (entry) => entry.isIntersecting && loadMoreMessages()
                ),
                {
                    rootMargin: "0px 0px 250px 0px",   
                }
        );

        if (loadMoreIntersect.current) {
            setTimeout(() => {
                observer.observe(loadMoreIntersect.current);
            }, 100);   
        }
        
        return () => {
            observer.disconnect();
        };
    }, [localMessages]);
    
    return ( 
        <>
       {!messages && (
            <div className="flex flex-col items-center justify-center h-full gap-8 text-center opacity-35">
                <div className="p-16 text-2xl md:text-4xl text-slate-200">
                    Выберите чат что бы посмотреть сообщения
                </div>
                <ChatBubbleLeftRightIcon className="inline-block w-32 h-32" />
            </div>
       )} 
       {messages && (
        <>
        <ConversationHeader
            selectedConversation={selectedConversation}
        />
        <div
        ref={messagesCtrRef}
        className="flex-1 p-5 overflow-y-auto"
        >
            {localMessages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                    <div className="text-lg text-slate-200">
                        Сообщений не найдено    
                    </div>
                </div>
            )}
            {localMessages.length > 0 && (
                <div className="flex flex-col flex-1">
                    <div ref={loadMoreIntersect}></div>
                    {localMessages.map((message) => (
                        <MessageItem
                            key={message.id}
                            message={message}
                        />
                    ))}
                </div>
            )}
        </div>
        <MessageInput conversation={selectedConversation} />
        </>
       )}
    </>
    );
}

Home.layout = (page) => {
    return (
            <AuthenticatedLayout user={page.props.auth.user}>
                <ChatLayout children={page} />
            </AuthenticatedLayout>
    );
}

export default Home;
