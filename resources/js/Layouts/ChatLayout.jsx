import ConversationItem from "@/Components/App/ConversationItem";
import GroupModal from "@/Components/App/GroupModal";
import TextInput from "@/Components/TextInput";
import { useEventBus } from "@/EventBus";
import { PencilSquareIcon } from "@heroicons/react/24/solid";
import { router, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";

const ChatLayout = ({ children }) => {
    const page = usePage();
    const conversations = page.props.conversations;
    const selectedConversation = page.props.selectedConversation;
    const [localConversations, setLocalConversations] = useState([]);
    const [sortedConversations, setSortedConversations] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState({});
    const [showGroupModal, setShowGroupModal] = useState(false);
    const { emit, on } = useEventBus();


    const isUserOnline = (userId) => onlineUsers[userId];

    const onSearch = (ev) => {
        const search = ev.target.value.toLowerCase();
        setLocalConversations(
            conversations.filter((conversation) => {
                return conversation.name.toLowerCase().includes(search)
            })
        );
    }

    const messageCreated = (message) => {
        setLocalConversations((oldUsers) => {
           return oldUsers.map((u) => {
            
            if (
                message.receiver_id && 
                !u.is_group &&
                (u.id == message.sender_id || u.id == message.receiver_id)
            ) {
                u.last_message = message.message;
                u.last_message_date = message.created_at;
                return u;
            }
            
            if (
                message.group_id &&
                u.is_group &&
                u.id == message.group_id
            ) {
                u.last_message = message.message;
                u.last_message_date = message.created_at;
                return u;
            }
            return u;
           }); 
        });
    };

    const messageDeleted = ( { prevMessage } ) => {
        if (!prevMessage) {
            return;
        }
        
        messageCreated(prevMessage);
    }
    
    useEffect(() => {
        const offCreated = on("message.created", messageCreated);
        const offDeleted = on("message.deleted", messageDeleted);
        const offModalShow = on("GroupModal.show", (group) => {
            setShowGroupModal(true);
        });

        const offGroupDelete = on("group.deleted", ({ id, name}) => {
            setLocalConversations((oldConversations) => {
                return oldConversations.filter((con) => con.id != id);
            });

            emit('toast.show', `Группа "${name}" удалена`);

            console.log(selectedConversation);
            if (
                !selectedConversation ||
                 (selectedConversation.is_group && selectedConversation.id == id)
                ) {
                    router.visit(route("dashboard"));
            }
        });

        return () => {
            offCreated();
            offDeleted();
            offModalShow();
            offGroupDelete();
        };
    }, [on]);
    
    useEffect(() => {
        setSortedConversations(
            localConversations.sort((a, b) => {
                if (a.blocked_at && b.blocked_at) {
                    return a.blocked_at > b.blocked_at ? 1 : -1;
                } else if (a.blocked_at) {
                    return 1;
                } else if (b.blocked_at) {
                    return -1;
                }
                if (a.last_message_date && b.last_message_date) {
                    return b.last_message_date.localeCompare(
                        a.last_message_date
                    );
                } else if (a.last_message_date) {
                    return -1;
                } else if (b.last_message_date) {
                    return 1;
                } else {
                    return 0;
                }
            })
        );
    }, [localConversations]);

    useEffect(() => {
        setLocalConversations(conversations);
    }, [conversations]);

    useEffect(() => {
        Echo.join("online")
        .here((users) => { 
            const onlineUsersObj = Object.fromEntries(
                users.map((user) => [user.id,user])
            );

            setOnlineUsers((prevOnlineUsers) => {
                return { ...prevOnlineUsers, ...onlineUsersObj };
            });
         })
        .joining((user) => { setOnlineUsers((prevOnlineUsers) => {
            const updatedUsers = { ...prevOnlineUsers };
            updatedUsers[user.id] = user;
            return updatedUsers;
        }); 
    })
        .leaving((user) => { 
            setOnlineUsers((prevOnlineUsers) => {
                const updatedUsers = { ...prevOnlineUsers };
                delete updatedUsers[user.id];
                return updatedUsers;
         });
         })
        .error((error) => {
            console.error("error", error);
        });

        return () => {
            Echo.leave("online");
        };
    }, []);

    return ( 
    <>
        <div className="flex flex-1 w-full overflow-hidden">
            <div
            className={`transition-all w-full sm:w-[220px] md:w-[300px] bg-slate-800
                flex flex-col overflow-hidden ${
                    selectedConversation ? "-ml-[100%] sm:ml-0" : ""
                }`}
            >
                <div className="flex items-center justify-between px-3 py-2 text-xl font-medium text-gray-200">
                    Мои чаты
                    <div className="tooltip tooltip-left"
                    data-tip="Создать новую группу"
                    >
                        <button onClick={ev => setShowGroupModal(true)} className="text-gray-400 hover:text-gray-200">
                            <PencilSquareIcon className="inline w-4 ml-2 h-4-block" />
                        </button>
                    </div>
                </div>
                <div className="p-3">
                    <TextInput
                    onKeyUp={onSearch}
                    placeholder="Найти группу или пользователя"
                    className="w-full"
                    />
                </div>
                <div className="flex-1 overflow-auto">
                    {sortedConversations && 
                        sortedConversations.map((conversation) => (
                          <ConversationItem
                            key={`${
                                conversation.is_group
                                ? "group_"
                                : "user_"
                            }${conversation.id}`}
                            conversation={conversation}
                            online={!!isUserOnline(conversation.id)}
                            selectedConversation={selectedConversation}
                          />  
                        ))}
                </div>
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
                {children}
            </div>
        </div>
        <GroupModal
         show={showGroupModal}
         onClose={() => setShowGroupModal(false)} 
         />
        </>
    );
};

export default ChatLayout;