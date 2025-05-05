"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
  useLayoutEffect,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Inter, Poppins } from "next/font/google";
import Image from "next/image";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Wrap the entire component with memo to prevent unnecessary re-renders
const ChatApp = memo(() => {
  // Add a state to track if component is mounted (client-side only)
  const [messageId, setMessageId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMessageId(`msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
  }, []);
  const [isMounted, setIsMounted] = useState(false);
  // Add state for auto-scroll button
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  // Use useEffect to set mounted state after initial render (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setIsLoading(true);
  }, []);
  // TypeScript Interfaces
  interface User {
    id: string;
    name: string;
    avatar: string;
    status: "online" | "offline" | "brb" | "busy";
    lastSeen?: Date;
    isTyping: boolean;
  }

  interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: Date;
    reactions: {
      [userId: string]: string; // emoji
    };
    status: "sent" | "delivered" | "read";
  }

  // Add this function to the types
  interface ChatInputProps {
    onSendMessage: (message: string) => void;
    isDarkMode: boolean;
    currentUser: User | null;
  }

  // Add this interface for LoginInput props
  interface LoginInputProps {
    onLogin: (name: string) => void;
    isDarkMode: boolean;
  }

  // Update the MessageComponentProps interface
  interface MessageComponentProps {
    message: Message;
    darkMode: boolean;
    currentUser: User | null;
    messagesEndRef: React.MutableRefObject<HTMLDivElement | null>;
    formatTimestamp: (date: Date) => string;
    handleEmojiReaction: (messageId: string, emoji: string) => void; // Add this prop
  }

  // References for scroll event handling
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastKnownPositionRef = useRef({
    isAtBottom: true,
    showScrollButton: false,
  });

  // Memoized ChatInput component to prevent unnecessary re-renders
  const ChatInput = memo(
    ({ onSendMessage, isDarkMode, currentUser }: ChatInputProps) => {
      const [localInputMessage, setLocalInputMessage] = useState("");
      const [localIsTyping, setLocalIsTyping] = useState(false);
      const localTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
      const inputRef = useRef<HTMLInputElement>(null);

      // Focus input when component mounts
      useEffect(() => {
        if (inputRef.current && currentUser) {
          inputRef.current.focus();
        }
      }, [currentUser]);

      // Handle local typing indicator with debounce to prevent rapid re-renders
      const handleLocalTyping = useCallback(() => {
        if (!currentUser) return;

        if (!localIsTyping) {
          setLocalIsTyping(true);
        }

        // Clear existing timeout
        if (localTypingTimeoutRef.current) {
          clearTimeout(localTypingTimeoutRef.current);
        }

        // Set new timeout
        const timeout = setTimeout(() => {
          setLocalIsTyping(false);
          localTypingTimeoutRef.current = null;
        }, 3000);

        localTypingTimeoutRef.current = timeout as unknown as NodeJS.Timeout;
      }, [localIsTyping, currentUser]);

      // Handle sending the message
      const handleSendMessage = useCallback(() => {
        if (localInputMessage.trim() && currentUser) {
          onSendMessage(localInputMessage);
          setLocalInputMessage("");
          setLocalIsTyping(false);

          // Clear typing indicator
          if (localTypingTimeoutRef.current) {
            clearTimeout(localTypingTimeoutRef.current);
            localTypingTimeoutRef.current = null;
          }

          // Maintain focus on input field after sending
          setTimeout(() => {
            inputRef.current?.focus();
          }, 0);
        }
      }, [localInputMessage, currentUser, onSendMessage]);

      // Handle Enter key press
      const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        },
        [handleSendMessage]
      );

      return (
        <div className="flex items-center relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={localInputMessage}
            onChange={(e) => {
              const newValue = e.target.value;
              setLocalInputMessage(newValue);
              if (newValue !== localInputMessage) {
                handleLocalTyping();
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={(e) => {
              e.preventDefault();
              // Scroll the chat container up when keyboard opens on mobile
              if (window.innerWidth < 768) {
                setTimeout(() => {
                  window.scrollTo(0, 0);
                  document.body.scrollTop = 0;
                }, 100);
              }
            }}
            autoFocus={!!currentUser}
            className={`flex-1 px-3 sm:px-4 py-1 sm:py-2 text-base border-y border-l rounded-l-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDarkMode
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                : "bg-white border-gray-300 text-gray-800 placeholder-gray-500"
            }`}
            style={{
              willChange: "contents",
              transition: "all 0.2s ease-out",
              minHeight: window.innerWidth < 768 ? "32px" : "36px",
              fontSize: "16px", // Prevent zoom on mobile
              lineHeight: window.innerWidth < 768 ? "18px" : "22px",
            }}
          />
          <motion.button
            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-500 text-white border-y border-r border-blue-500 rounded-r-full hover:bg-blue-600 focus:outline-none font-medium min-h-[32px] sm:min-h-[36px] min-w-[50px] sm:min-w-[60px]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            style={{ color: "white", fontWeight: 500 }}
          >
            Send
          </motion.button>

          {localIsTyping && currentUser && (
            <div
              className={`absolute -top-5 left-4 flex items-center gap-1 py-1 px-2 rounded-full text-xs ${
                isDarkMode
                  ? "bg-gray-700/70 text-gray-300"
                  : "bg-gray-100/90 text-gray-600"
              } animate-fade-in backdrop-blur-sm transition-all duration-200`}
              style={{
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                transform: "translateY(-2px)",
              }}
            >
              <div className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1 h-1 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1 h-1 rounded-full bg-blue-500 animate-bounce"></span>
              </div>
              <span className="ml-1 text-[11px]">typing...</span>
            </div>
          )}
        </div>
      );
    }
  );

  // Memoized LoginInput component to prevent unnecessary re-renders
  const LoginInput = memo(({ onLogin, isDarkMode }: LoginInputProps) => {
    const [localLoginName, setLocalLoginName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const handleLogin = useCallback(() => {
      if (localLoginName.trim()) {
        onLogin(localLoginName.trim());
      }
    }, [localLoginName, onLogin]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleLogin();
        }
      },
      [handleLogin]
    );

    return (
      <div
        className="space-y-3 sm:space-y-4 w-full"
        style={{
          contain: "content",
          willChange: "transform",
          transform: "translateZ(0)",
        }}
      >
        <div className="w-full">
          <label className="block text-sm font-medium mb-1.5">Your Name</label>
          <input
            ref={inputRef}
            type="text"
            value={localLoginName}
            onChange={(e) => setLocalLoginName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your name"
            className={`w-full px-3 sm:px-4 py-2 text-base rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
              isDarkMode
                ? "bg-gray-700 border-gray-600 focus:border-gray-500 text-white placeholder-gray-400"
                : "bg-white border-gray-300 focus:border-blue-500 text-gray-800 placeholder-gray-500"
            }`}
            style={{
              willChange: "contents",
              minHeight: "42px",
              fontSize: "16px",
            }}
            autoFocus
            autoComplete="name"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogin}
          disabled={!localLoginName.trim()}
          className={`w-full py-2.5 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 focus:outline-none transition-colors ${
            !localLoginName.trim() && "opacity-50 cursor-not-allowed"
          }`}
          style={{ minHeight: "42px" }}
        >
          Join Chat
        </motion.button>
      </div>
    );
  });

  // States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  // Track only which message has an active emoji picker (single state change)
  const [activeEmojiMessage, setActiveEmojiMessage] = useState<string | null>(
    null
  );
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationSound, setNotificationSound] = useState(true);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Add state for sidebar visibility on mobile
  const [showSidebar, setShowSidebar] = useState(false);
  // Add a state to track if auto-scrolling is needed
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  // Add a ref to track the last render timestamp to throttle updates
  const lastRenderRef = useRef<number>(Date.now());
  // Add a throttle timeout ref
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add initial state check to ensure sidebar is closed on mobile
  useEffect(() => {
    if (isMounted) {
      // Force sidebar closed on mobile
      if (window.innerWidth < 768) {
        setShowSidebar(false);
      }
    }
  }, [isMounted]);

  // Add a useEffect to set body background color matching the theme - after darkMode is defined
  useEffect(() => {
    if (isMounted) {
      // Set body background color to match the theme
      if (darkMode) {
        document.documentElement.classList.add("dark");
        document.body.style.backgroundColor = "#111827"; // gray-900
      } else {
        document.documentElement.classList.remove("dark");
        document.body.style.backgroundColor = "#f9fafb"; // gray-50
      }
    }
    return () => {
      if (isMounted) {
        document.documentElement.classList.remove("dark");
        document.body.style.backgroundColor = "";
      }
    };
  }, [darkMode, isMounted]);

  // Add a useEffect to fix body styles to prevent outer scrolling
  useEffect(() => {
    if (isMounted) {
      // Fix body and html styles to prevent scrolling
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.height = "100dvh";
      document.body.style.margin = "0";
      document.body.style.padding = "0";
      document.documentElement.style.height = "100dvh";
      document.body.style.position = "relative";
      document.body.style.width = "100%";
      document.body.style.overscrollBehavior = "none";

      // Add CSS variable for accurate viewport height
      const updateVhUnit = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty("--vh", `${vh}px`);
      };

      // Initial call
      updateVhUnit();

      // Add event listener for resize
      window.addEventListener("resize", updateVhUnit);

      return () => {
        if (isMounted) {
          document.body.style.overflow = "";
          document.documentElement.style.overflow = "";
          document.body.style.height = "";
          document.body.style.margin = "";
          document.body.style.padding = "";
          document.documentElement.style.height = "";
          document.body.style.position = "";
          document.body.style.width = "";
          document.body.style.overscrollBehavior = "";

          window.removeEventListener("resize", updateVhUnit);
        }
      };
    }
  }, [isMounted]);

  // Toggle sidebar visibility with throttling
  const toggleSidebar = useCallback(() => {
    // Throttle sidebar toggling to prevent rapid state changes
    const now = Date.now();
    if (now - lastRenderRef.current < 300) {
      // If less than 300ms has passed, queue the toggle
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }

      throttleTimeoutRef.current = setTimeout(() => {
        setShowSidebar((prev) => !prev);
        lastRenderRef.current = Date.now();
      }, 300) as unknown as NodeJS.Timeout;
      return;
    }

    // Otherwise toggle immediately
    setShowSidebar((prev) => !prev);
    lastRenderRef.current = now;
  }, []);

  // Emojis for reactions
  const emojis = useMemo(() => ["👍", "❤️", "😂", "😮", "😢", "😡"], []);

  // Mock data for users
  const mockUsers: User[] = useMemo(
    () => [
      {
        id: "user1",
        name: "Alex Johnson",
        avatar: "https://randomuser.me/api/portraits/men/32.jpg",
        status: "online",
        isTyping: false,
      },
      {
        id: "user2",
        name: "Samantha Lee",
        avatar: "https://randomuser.me/api/portraits/women/44.jpg",
        status: "online",
        isTyping: false,
      },
      {
        id: "user3",
        name: "Michael Chen",
        avatar: "https://randomuser.me/api/portraits/men/59.jpg",
        status: "brb",
        isTyping: false,
      },
      {
        id: "user4",
        name: "Jessica Taylor",
        avatar: "https://randomuser.me/api/portraits/women/16.jpg",
        status: "busy",
        isTyping: false,
      },
      {
        id: "user5",
        name: "David Wilson",
        avatar: "https://randomuser.me/api/portraits/men/7.jpg",
        status: "offline",
        lastSeen: new Date(Date.now() - 3600000),
        isTyping: false,
      },
    ],
    []
  );

  // Mock chat messages
  const mockMessages: Message[] = useMemo(
    () =>
      [
        {
          id: "msg1",
          senderId: "user1",
          text: "Hey everyone! How's it going?",
          timestamp: new Date(Date.now() - 3600000 * 3),
          reactions: { user2: "👍", user4: "❤️" },
          status: "sent",
        },
        {
          id: "msg2",
          senderId: "user2",
          text: "Pretty good! Working on that new project. What about you?",
          timestamp: new Date(Date.now() - 3600000 * 2.5),
          reactions: {},
          status: "sent",
        },
        {
          id: "msg3",
          senderId: "user3",
          text: "I'm just taking a quick break. brb in 10 minutes!",
          timestamp: new Date(Date.now() - 3600000 * 2),
          reactions: { user1: "👍" },
          status: "sent",
        },
        {
          id: "msg4",
          senderId: "user1",
          text: "No worries, take your time!",
          timestamp: new Date(Date.now() - 3600000 * 1.8),
          reactions: {},
          status: "sent",
        },
        {
          id: "msg5",
          senderId: "user4",
          text: "Hey can someone help me with the new API documentation?",
          timestamp: new Date(Date.now() - 3600000 * 1.5),
          reactions: {},
          status: "sent",
        },
        {
          id: "msg6",
          senderId: "user2",
          text: "I can help! Give me a sec to find my notes.",
          timestamp: new Date(Date.now() - 3600000 * 1.2),
          reactions: { user4: "🙏" },
          status: "sent",
        },
        {
          id: "msg7",
          senderId: "user1",
          text: "Has anyone seen the latest deployment? Looks like there might be an issue with the authentication module.",
          timestamp: new Date(Date.now() - 3600000 * 1),
          reactions: { user2: "😮" },
          status: "sent",
        },
        {
          id: "msg8",
          senderId: "user4",
          text: "I'm checking it now. Will update everyone in a few minutes when I know more.",
          timestamp: new Date(Date.now() - 3600000 * 0.5),
          reactions: { user1: "👍", user2: "👍" },
          status: "sent",
        },
      ] as Message[],
    []
  );

  // Initialize with mock data - client-side only
  useEffect(() => {
    if (isMounted) {
      setUsers(mockUsers);
      setMessages(mockMessages);

      // No longer force scrolling here since ChatWindow handles it
    }
  }, [isMounted, mockMessages, mockUsers]);

  // Explicitly scroll to bottom (used after sending messages)
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    });
  }, []);

  // Track previous message count to only scroll when new messages are added
  const prevMessageCountRef = useRef(0);

  // Remove redundant initial scroll effect
  useEffect(() => {
    // No longer needed - ChatWindow handles initial scroll
  }, [isMounted]);

  // Scroll to bottom when new messages are added (but not during typing)
  useEffect(() => {
    // No longer scroll on new messages - let the user control scrolling

    // Update the previous message count
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  // Add scroll event listener to track user scroll position
  useEffect(() => {
    const chatContainer = messagesEndRef.current?.parentElement;
    if (!chatContainer) return;

    const handleScroll = () => {
      // Determine if user is at bottom
      const isAtBottom =
        chatContainer.scrollHeight -
          chatContainer.scrollTop -
          chatContainer.clientHeight <
        150;

      // Update auto-scroll state
      setShouldAutoScroll(isAtBottom);

      // Update scroll button visibility
      setShowScrollToBottom(!isAtBottom && messages.length > 0);
    };

    chatContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      chatContainer.removeEventListener("scroll", handleScroll);
    };
  }, [messages.length]);

  // Custom handleLogin function to work with the memoized LoginInput
  const handleLoginSubmit = useCallback(
    (name: string) => {
      if (!isMounted) return; // Skip if not mounted yet (SSR)

      // Use a more stable ID generation
      const userId = `user-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
      const avatarIndex = name.length % 60; // Deterministic avatar based on name length

      const newUser: User = {
        id: userId,
        name: name,
        avatar: `https://randomuser.me/api/portraits/men/${avatarIndex}.jpg`,
        status: "online",
        isTyping: false,
      };
      setCurrentUser(newUser);
      setUsers((prevUsers) => [...prevUsers, newUser]);
      setShowLoginModal(false);
      chatInputRef.current?.focus();
    },
    [isMounted]
  );

  // Update typing status
  const updateUserTypingStatus = useCallback(
    (userId: string, isTyping: boolean) => {
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, isTyping } : user
        )
      );
    },
    []
  );

  // Memoized emoji reaction handler to maintain stable reference
  const handleEmojiReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!currentUser) return;

      // Set flag to indicate current update is for emoji reaction
      const isEmojiReactionRef = { current: true };

      // Store current scroll position
      const chatContainer = messagesEndRef.current?.parentElement;
      const prevScrollPosition = chatContainer?.scrollTop ?? 0;
      const prevScrollHeight = chatContainer?.scrollHeight ?? 0;

      // Update messages with the reaction - optimized to only update the specific message
      setMessages((prevMessages) => {
        return prevMessages.map((message) => {
          if (message.id === messageId) {
            // Toggle emoji reaction
            const newReactions = { ...message.reactions };
            if (newReactions[currentUser.id] === emoji) {
              delete newReactions[currentUser.id];
            } else {
              newReactions[currentUser.id] = emoji;
            }
            return { ...message, reactions: newReactions };
          }
          return message;
        });
      });

      // Forcefully restore scroll position after message update
      // Use multiple timeouts with different delays to ensure it works
      const restoreScroll = () => {
        if (chatContainer) {
          // Adjust for any height changes
          const newScrollHeight = chatContainer.scrollHeight;
          const heightDiff = newScrollHeight - prevScrollHeight;
          chatContainer.scrollTop = prevScrollPosition + heightDiff;
        }
      };

      // Apply multiple times to ensure it works across browsers and conditions
      setTimeout(restoreScroll, 0);
      setTimeout(restoreScroll, 10);
      setTimeout(restoreScroll, 50);
      setTimeout(restoreScroll, 100);
    },
    []
  );

  // Add a reference to track the last status change time
  const lastStatusUpdateRef = useRef<number>(0);
  // Add animation frame request ID for cancellation
  const statusAnimationRef = useRef<number | null>(null);

  // Change user status with throttling and smooth animation
  const changeUserStatus = useCallback(
    (status: User["status"]) => {
      if (!currentUser || currentUser.status === status) return;

      // Throttle status updates to prevent rapid changes and screen flickering
      const now = Date.now();
      if (now - lastStatusUpdateRef.current < 300) {
        // If less than 300ms has passed since last update, ignore this change
        return;
      }

      // Update the timestamp
      lastStatusUpdateRef.current = now;

      // Cancel any pending animation frame
      if (statusAnimationRef.current) {
        cancelAnimationFrame(statusAnimationRef.current);
      }

      // Use requestAnimationFrame to ensure UI updates in sync with browser paint cycle
      // This helps prevent layout shifts and screen shaking
      statusAnimationRef.current = requestAnimationFrame(() => {
        // Use a function to update state to ensure we're working with the latest state
        setCurrentUser((prev) => {
          if (!prev) return null;
          return { ...prev, status };
        });

        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === currentUser.id ? { ...user, status } : user
          )
        );

        // Clear the animation frame reference
        statusAnimationRef.current = null;
      });
    },
    [currentUser]
  );

  // Simulate response from another user
  const simulateResponse = useCallback(() => {
    const shouldRespond = new Date().getSeconds() % 3 === 0;

    if (!isMounted || !currentUser || !shouldRespond) {
      return;
    }

    const respondingUsers = users.filter(
      (user) => user.id !== currentUser.id && user.status === "online"
    );
    if (respondingUsers.length === 0) return;

    // Choose a responding user deterministically based on current time
    const respondingUserIndex =
      new Date().getMinutes() % respondingUsers.length;
    const respondingUser = respondingUsers[respondingUserIndex];

    // Simulate typing indicator
    setTimeout(() => {
      if (!isMounted) return;
      updateUserTypingStatus(respondingUser.id, true);
    }, 1000);

    // Simulate response message
    setTimeout(() => {
      if (!isMounted) return;
      updateUserTypingStatus(respondingUser.id, false);

      const responses = [
        "That's interesting! Tell me more.",
        "I agree with your point.",
        "I'm not sure I follow. Can you explain?",
        "Great idea!",
        "Let's discuss this further in the meeting tomorrow.",
        "I'll check with the team and get back to you.",
        "Thanks for the update!",
        "Could you share the documentation?",
      ];

      // Choose response deterministically based on message text length
      const responseIndex = messages.length % responses.length;
      const responseText = responses[responseIndex];

      const newMessage: Message = {
        id: `msg-response-${Date.now()}`,
        senderId: respondingUser.id,
        text: responseText,
        timestamp: new Date(),
        reactions: {},
        status: "sent",
      };

      setMessages((prevMessages) => [...prevMessages, newMessage]);

      // Occasionally add a reaction (deterministically)
      if (messages.length % 3 === 0) {
        setTimeout(() => {
          if (!isMounted) return;
          const lastMessages = [...messages].reverse();
          const userMessage = lastMessages.find(
            (msg) => msg.senderId === currentUser.id
          );
          if (userMessage) {
            const emojiIndex = userMessage.text.length % emojis.length;
            handleEmojiReaction(userMessage.id, emojis[emojiIndex]);
          }
        }, 1500);
      }
    }, 3000);
  }, [
    currentUser,
    emojis,
    isMounted,
    messages,
    updateUserTypingStatus,
    users,
    handleEmojiReaction,
  ]);

  // Update the sendMessage function to work with the new component
  const handleSendMessage = useCallback(
    (messageText: string) => {
      if (!currentUser || !isMounted) {
        return;
      }

      const messageId = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newMessage: Message = {
        id: messageId,
        senderId: currentUser.id,
        text: messageText,
        timestamp: new Date(),
        reactions: {},
        status: "sent",
      };

      setMessages((prevMessages) => [...prevMessages, newMessage]);

      // Reset state for typing indicator in parent (for other users)
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
      setIsTyping(false);
      updateUserTypingStatus(currentUser.id, false);

      // Force scroll to bottom when sending a message
      scrollToBottom();

      // Simulate other user typing and responding
      simulateResponse();
    },
    [
      currentUser,
      isMounted,
      scrollToBottom,
      simulateResponse,
      typingTimeout,
      updateUserTypingStatus,
    ]
  );

  // Format timestamp
  const formatTimestamp = useCallback((date: Date) => {
    return format(date, "h:mm a");
  }, []);

  // Get user by ID
  const getUserById = (id: string) => {
    return users.find((user) => user.id === id);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Toggle notification sound
  const toggleNotificationSound = () => {
    setNotificationSound(!notificationSound);
  };

  // Logout user
  const handleLogout = () => {
    setCurrentUser(null);
    setShowLoginModal(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Press Enter to send message
      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        document.activeElement === chatInputRef.current
      ) {
        e.preventDefault();
        // We don't need to call handleSendMessage here anymore
        // since the ChatInput component handles its own Enter key
      }
      // Press Escape to close emoji picker
      else if (e.key === "Escape") {
        // Hide emoji picker
        if (activeEmojiMessage) {
          setActiveEmojiMessage(null);
        }
        // Hide settings modal
        if (showSettingsModal) {
          setShowSettingsModal(false);
        }
      }
    };

    // Close emoji picker when clicking outside of message or emoji picker
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isClickingMessage = target.closest(".px-4.py-2.rounded-2xl");
      const isClickingPicker = target.closest(".mt-2.p-2.rounded-lg.shadow-lg");

      if (!isClickingMessage && !isClickingPicker && activeEmojiMessage) {
        setActiveEmojiMessage(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleDocumentClick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [activeEmojiMessage, showSettingsModal]);

  // Get online users count
  const getOnlineUsersCount = () => {
    return users.filter((user) => user.status === "online").length;
  };

  // Update the useEffect for state changes
  useEffect(() => {
    // Ensure document body has no overflow to prevent layout shifts
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Add a layout effect to handle state changes smoothly with transform containment
  useLayoutEffect(() => {
    // This forces a synchronous layout calculation before rendering
    // which helps prevent layout shifts
    if (isMounted) {
      // Use transform containment for better performance
      document.documentElement.style.setProperty("transform", "translateZ(0)");
      document.body.style.setProperty("transform", "translateZ(0)");

      // Force a reflow
      const forceReflow = document.body.offsetHeight;
    }

    return () => {
      // Clean up properties
      document.documentElement.style.removeProperty("transform");
      document.body.style.removeProperty("transform");
    };
  }, [isMounted, currentUser?.status, showSidebar]);

  // Scroll to bottom function for the scroll-to-bottom button
  const handleScrollToBottom = useCallback(() => {
    setShouldAutoScroll(true);
    scrollToBottom();
    // Hide the button after scrolling
    setShowScrollToBottom(false);
  }, [scrollToBottom]);

  // Navbar Component
  const Navbar = () => {
    return (
      <div
        className={`px-4 py-3 flex justify-between items-center z-10 ${
          darkMode
            ? "bg-gray-900 text-white border-gray-700"
            : "bg-gray-50 text-gray-800 border-gray-200"
        }`}
        style={{ opacity: 1 }}
      >
        <div className="flex items-center space-x-2">
          {/* Mobile sidebar toggle button */}
          <button
            className="md:hidden mr-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          {/* Logo and title - removed button wrap */}
          <div
            className="text-2xl font-bold text-blue-500"
            onClick={(e) => e.preventDefault()}
            style={{ opacity: 1 }}
          >
            💬
          </div>
          <h1 className="text-xl font-bold" style={{ opacity: 1 }}>
            ChatConnect
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {currentUser && (
            <>
              <div className="hidden md:flex items-center mr-4">
                <span className="mr-2 text-sm font-medium">
                  {getOnlineUsersCount()} online
                </span>
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
              </div>

              <div className="relative group">
                <button
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all duration-300 ease-in-out
                    border-2 border-transparent hover:border-blue-400 min-w-[40px] min-h-[40px]
                    ${darkMode ? "hover:bg-gray-800" : "hover:bg-blue-50"}`}
                  onClick={() => setShowSettingsModal(true)}
                >
                  <div className="relative">
                    <Image
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full"
                    />
                    <span
                      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ${
                        currentUser.status === "online"
                          ? "bg-green-500"
                          : currentUser.status === "busy"
                            ? "bg-red-500"
                            : currentUser.status === "brb"
                              ? "bg-yellow-500"
                              : "bg-gray-400"
                      } border border-white`}
                    ></span>
                  </div>
                  <span className="font-medium hidden md:inline-block">
                    {currentUser.name}
                  </span>
                </button>

                <div className="absolute right-0 mt-2 hidden group-hover:block z-50">
                  <div
                    className={`py-1 rounded-xl shadow-lg w-48 overflow-hidden border ${
                      darkMode
                        ? "bg-gray-800 border-gray-700 text-gray-100"
                        : "bg-white border-gray-200 text-gray-800"
                    }`}
                  >
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                        Set Status
                      </div>
                    </div>
                    <div
                      className={`px-4 py-2.5 flex items-center space-x-2 cursor-pointer transition-colors duration-200
                        ${darkMode ? "hover:bg-gray-700" : "hover:bg-blue-50"}`}
                      onClick={() => changeUserStatus("online")}
                    >
                      <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                      <span>Online</span>
                    </div>
                    <div
                      className={`px-4 py-2.5 flex items-center space-x-2 cursor-pointer transition-colors duration-200
                        ${darkMode ? "hover:bg-gray-700" : "hover:bg-blue-50"}`}
                      onClick={() => changeUserStatus("busy")}
                    >
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
                      <span>Busy</span>
                    </div>
                    <div
                      className={`px-4 py-2.5 flex items-center space-x-2 cursor-pointer transition-colors duration-200
                        ${darkMode ? "hover:bg-gray-700" : "hover:bg-blue-50"}`}
                      onClick={() => changeUserStatus("brb")}
                    >
                      <div className="h-2.5 w-2.5 rounded-full bg-yellow-500"></div>
                      <span>Be Right Back</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // User List Component
  const UserList = () => {
    return (
      <div
        className={`h-full flex flex-col border-r ${
          darkMode
            ? "bg-gray-900 text-white border-gray-700"
            : "bg-gray-50 text-gray-800 border-gray-200"
        }`}
        style={{ opacity: 1 }}
      >
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-lg flex items-center">
            <span>Team Members</span>
            <span className="ml-2 text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              {getOnlineUsersCount()} online
            </span>
          </h2>
        </div>

        <div className="flex-1 p-2 overflow-y-auto">
          {users
            .filter((user) => user.status !== "offline")
            .map((user) => (
              <div
                key={user.id}
                className={`flex items-center p-3 rounded-xl my-2 transition-all duration-300 ease-in-out shadow-sm ${
                  darkMode
                    ? "hover:bg-gray-800 hover:shadow-md"
                    : "hover:bg-blue-50 hover:shadow-md"
                }
                `}
              >
                <div className="relative">
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full border-2 border-transparent hover:border-blue-400"
                    loading="lazy"
                  />
                  <span
                    className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${
                      user.status === "online"
                        ? "bg-green-500"
                        : user.status === "busy"
                          ? "bg-red-500"
                          : user.status === "brb"
                            ? "bg-yellow-500"
                            : "bg-gray-400"
                    } border-2 ${
                      darkMode ? "border-gray-900" : "border-gray-50"
                    }`}
                  ></span>
                </div>
                <div className="ml-3">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs flex items-center">
                    {user.isTyping ? (
                      <span className="text-blue-500">typing...</span>
                    ) : (
                      <span
                        className={
                          user.status === "online"
                            ? "text-green-500"
                            : user.status === "busy"
                              ? "text-red-500"
                              : "text-yellow-500"
                        }
                      >
                        {user.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

          {users.filter((user) => user.status === "offline").length > 0 && (
            <div className="mt-6 mb-2 px-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">
                Offline -{" "}
                {users.filter((user) => user.status === "offline").length}
              </h3>
            </div>
          )}

          {users
            .filter((user) => user.status === "offline")
            .map((user) => (
              <div
                key={user.id}
                className={`flex items-center p-3 rounded-xl my-2 transition-all duration-300 ease-in-out opacity-60
                  ${
                    darkMode
                      ? "hover:bg-gray-800 hover:opacity-80"
                      : "hover:bg-gray-100 hover:opacity-80"
                  }
                `}
              >
                <div className="relative">
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full grayscale transition-all duration-300 hover:grayscale-0"
                    loading="lazy"
                  />
                  <span
                    className={`absolute bottom-0 right-0 h-3 w-3 rounded-full bg-gray-400 border-2 ${
                      darkMode ? "border-gray-900" : "border-gray-50"
                    }`}
                  ></span>
                </div>
                <div className="ml-3">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs">
                    {user.lastSeen
                      ? `Last seen ${formatTimestamp(user.lastSeen)}`
                      : "Offline"}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  // Create a separate StatusButtonGroup component
  const StatusButtonGroup = memo(
    ({
      currentStatus,
      onChangeStatus,
    }: {
      currentStatus: User["status"] | undefined;
      onChangeStatus: (status: User["status"]) => void;
    }) => {
      return (
        <div
          className="flex space-x-3 h-[32px]"
          style={{ contain: "strict", minHeight: "32px" }}
        >
          <StatusButton
            status="online"
            isActive={currentStatus === "online"}
            onClick={() => onChangeStatus("online")}
            color="green"
            label="Online"
          />
          <StatusButton
            status="brb"
            isActive={currentStatus === "brb"}
            onClick={() => onChangeStatus("brb")}
            color="yellow"
            label="BRB"
          />
          <StatusButton
            status="busy"
            isActive={currentStatus === "busy"}
            onClick={() => onChangeStatus("busy")}
            color="red"
            label="Busy"
          />
        </div>
      );
    }
  );

  // Individual status button
  const StatusButton = memo(
    ({
      status,
      isActive,
      onClick,
      color,
      label,
    }: {
      status: User["status"];
      isActive: boolean;
      onClick: () => void;
      color: "green" | "yellow" | "red";
      label: string;
    }) => {
      // Get button style variables once to prevent recalculation
      const buttonStyle = {
        willChange: "transform, opacity",
        transform: "translate3d(0,0,0)",
        backfaceVisibility: "hidden" as const,
        contain: "layout style paint",
        transition: "background-color 0.2s ease-out",
      };

      // Pre-calculate all possible classNames to avoid dynamic class generation on click
      const buttonClasses = {
        base: `px-3 py-1.5 rounded-full flex items-center space-x-1 min-w-[72px] min-h-[28px] justify-center`,
        inactive: {
          light: `text-gray-600 hover:bg-${color}-50 hover:text-${color}-600`,
          dark: `text-gray-300 hover:bg-gray-700 hover:text-${color}-400`,
        },
        active: {
          light: `bg-${color}-100 text-${color}-600`,
          dark: `bg-${color}-900 bg-opacity-30 text-${color}-400`,
        },
      };

      const getButtonClass = () => {
        const theme = darkMode ? "dark" : "light";
        const state = isActive ? "active" : "inactive";
        return `${buttonClasses.base} ${buttonClasses[state][theme]}`;
      };

      // Prevent default onClick to apply custom handling with animation frame
      const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        // Use requestAnimationFrame to ensure UI updates in sync with browser paint cycle
        requestAnimationFrame(() => {
          onClick();
        });
      };

      return (
        <button
          onClick={handleClick}
          className={getButtonClass()}
          style={buttonStyle}
        >
          <div className={`h-2 w-2 rounded-full bg-${color}-500 mr-1.5`}></div>
          <span>{label}</span>
        </button>
      );
    }
  );

  // Extracted Message Component with full memoization and local reaction state
  const MessageComponent = memo(
    ({
      message: initialMessage,
      darkMode,
      currentUser,
      messagesEndRef,
      formatTimestamp,
      handleEmojiReaction,
    }: MessageComponentProps) => {
      const [isEmojiPickerActive, setIsEmojiPickerActive] = useState(false);
      const [localReactions, setLocalReactions] = useState(
        initialMessage.reactions
      );
      const [isHovered, setIsHovered] = useState(false);

      const sender = getUserById(initialMessage.senderId);
      if (!sender) return null;

      const isCurrentUser = currentUser?.id === sender.id;

      // Handle emoji selection
      const handleEmojiClick = (emoji: string) => {
        if (!currentUser) return;

        // Update local state immediately for better UX
        setLocalReactions((prev) => {
          const newReactions = { ...prev };
          if (newReactions[currentUser.id] === emoji) {
            delete newReactions[currentUser.id];
          } else {
            newReactions[currentUser.id] = emoji;
          }
          return newReactions;
        });

        // Call the parent handler
        handleEmojiReaction(initialMessage.id, emoji);
        setIsEmojiPickerActive(false);
      };

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`message-container flex items-start space-x-2 mb-3 group ${isCurrentUser ? "flex-row-reverse" : ""}`}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
        >
          <div className="relative flex-shrink-0">
            <Image
              src={sender.avatar}
              alt={sender.name}
              width={28}
              height={28}
              className="h-7 w-7 rounded-full transition-transform duration-200 hover:scale-110"
            />
            {sender.status === "online" && (
              <motion.div
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </div>

          <div
            className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"} max-w-[75%]`}
          >
            <div className="flex items-end gap-1">
              <motion.div
                className={`px-3 py-1.5 rounded-2xl ${
                  isCurrentUser
                    ? darkMode
                      ? "bg-blue-600 text-white"
                      : "bg-blue-500 text-white"
                    : darkMode
                      ? "bg-gray-700 text-white"
                      : "bg-gray-100 text-gray-800"
                } shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer`}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                onClick={() => setIsEmojiPickerActive(!isEmojiPickerActive)}
              >
                <p className="whitespace-pre-wrap break-words text-sm">
                  {initialMessage.text}
                </p>
              </motion.div>

              <div className="flex flex-col items-end justify-end mb-1 min-w-[50px]">
                {isCurrentUser && (
                  <span
                    className={`text-xs mb-0.5 ${isCurrentUser ? "text-blue-300" : "text-gray-400"}`}
                  >
                    {initialMessage.status === "sent" && "✓"}
                    {initialMessage.status === "delivered" && "✓✓"}
                    {initialMessage.status === "read" && (
                      <span className="text-blue-400">✓✓</span>
                    )}
                  </span>
                )}

                <span className="message-timestamp text-[10px] text-gray-400">
                  {formatTimestamp(initialMessage.timestamp)}
                </span>
              </div>
            </div>

            {/* Emoji Picker */}
            {isEmojiPickerActive && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className={`mt-2 p-2 rounded-lg shadow-lg ${
                  darkMode ? "bg-gray-800" : "bg-white"
                } flex space-x-2 z-10`}
              >
                {emojis.map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xl
                      ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEmojiClick(emoji);
                    }}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Reactions */}
            {Object.keys(localReactions).length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`flex flex-wrap gap-1 mt-1 ${isCurrentUser ? "justify-end" : "justify-start"}`}
              >
                {Object.entries(localReactions).map(([userId, emoji]) => (
                  <motion.span
                    key={`${initialMessage.id}-${userId}`}
                    className="inline-flex items-center justify-center h-5 min-w-[20px] bg-gray-100 dark:bg-gray-700 rounded-full px-1 text-xs"
                    whileHover={{ scale: 1.2 }}
                    layout
                  >
                    {emoji}
                  </motion.span>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>
      );
    }
  );

  // Chat Window Component with optimized message handling
  const ChatWindow = memo(() => {
    // Ref for chat container to manage scrolling
    const chatContainerRef = useRef<HTMLDivElement>(null);
    // Ref to track if initial scroll has been done
    const initialScrollDoneRef = useRef<boolean>(false);
    // Input ref for focusing
    const localInputRef = useRef<HTMLInputElement | null>(null);

    // Find and focus the input element in the chat window
    const focusInput = useCallback(() => {
      // Focus using document query since the ref might not be directly accessible
      const inputElement = document.querySelector(
        ".flex-1.px-4.py-2.rounded-l-full.border"
      ) as HTMLInputElement;
      if (inputElement && currentUser) {
        inputElement.focus();
      }
    }, [currentUser]);

    // Focus the input whenever the window is clicked
    const handleChatWindowClick = useCallback(
      (e: React.MouseEvent) => {
        // Don't focus if clicking on a button or interactive element
        const target = e.target as HTMLElement;
        const isButton =
          target.tagName === "BUTTON" ||
          target.closest("button") ||
          target.className.includes("rounded-2xl");

        if (!isButton && currentUser) {
          focusInput();
        }
      },
      [focusInput, currentUser]
    );

    // Focus input on component mount
    useEffect(() => {
      if (currentUser) {
        focusInput();
      }
    }, [currentUser, focusInput]);

    // Only scroll to bottom on initial render, not on messages change
    useEffect(() => {
      // Only execute this once on mount
      if (!initialScrollDoneRef.current && chatContainerRef.current) {
        chatContainerRef.current.scrollTop =
          chatContainerRef.current.scrollHeight;
        initialScrollDoneRef.current = true;
      }
    }, []); // Empty dependency array ensures this only runs once on mount

    return (
      <div
        className={`h-full flex flex-col overflow-hidden ${
          darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
        }`}
        style={{ backgroundColor: darkMode ? "#1f2937" : "#ffffff" }}
        onClick={handleChatWindowClick}
      >
        {/* Scrollable message area - only this should scroll */}
        <div
          ref={chatContainerRef}
          className={`flex-1 px-2 sm:px-4 py-2 sm:py-4 overflow-y-auto min-h-0 pb-safe-area-inset ${
            darkMode ? "bg-gray-800" : "bg-gray-50"
          }`}
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: darkMode ? "#4B5563 #1F2937" : "#D1D5DB #F3F4F6",
            overscrollBehavior: "contain",
            backgroundColor: darkMode ? "#1f2937" : "#f9fafb",
            willChange: "scroll-position",
            contain: "size layout style paint",
            paddingBottom: "env(safe-area-inset-bottom, 16px)",
          }}
        >
          <div className="flex flex-col justify-end min-h-full space-y-2 sm:space-y-4">
            {messages.map((message) => (
              <MessageComponent
                key={message.id}
                message={message}
                darkMode={darkMode}
                currentUser={currentUser}
                messagesEndRef={messagesEndRef}
                formatTimestamp={formatTimestamp}
                handleEmojiReaction={handleEmojiReaction}
              />
            ))}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input area with reduced padding on mobile */}
        <div className="flex-shrink-0 px-2 sm:px-4 py-2 sm:py-4 border-t relative">
          <ChatInput
            onSendMessage={handleSendMessage}
            isDarkMode={darkMode}
            currentUser={currentUser}
          />

          {/* Status buttons - hidden on mobile */}
          <div className="hidden sm:flex justify-end mt-1 sm:mt-2">
            <div className="flex space-x-2 text-xs">
              <button
                onClick={() => changeUserStatus("online")}
                className={`px-2 py-1 rounded-full flex items-center min-w-[60px] sm:min-w-[72px] h-6 sm:h-7 justify-center
                  ${darkMode ? "text-gray-300" : "text-gray-600"}
                  ${
                    currentUser?.status === "online"
                      ? darkMode
                        ? "bg-green-900 bg-opacity-30 text-green-400"
                        : "bg-green-100 text-green-600"
                      : ""
                  }
                `}
              >
                <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-500 mr-1"></div>
                <span className="text-xs sm:text-sm">Online</span>
              </button>
              <button
                onClick={() => changeUserStatus("brb")}
                className={`px-2 py-1 rounded-full flex items-center min-w-[60px] sm:min-w-[72px] h-6 sm:h-7 justify-center
                  ${darkMode ? "text-gray-300" : "text-gray-600"}
                  ${
                    currentUser?.status === "brb"
                      ? darkMode
                        ? "bg-yellow-900 bg-opacity-30 text-yellow-400"
                        : "bg-yellow-100 text-yellow-600"
                      : ""
                  }
                `}
              >
                <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-yellow-500 mr-1"></div>
                <span className="text-xs sm:text-sm">BRB</span>
              </button>
              <button
                onClick={() => changeUserStatus("busy")}
                className={`px-2 py-1 rounded-full flex items-center min-w-[60px] sm:min-w-[72px] h-6 sm:h-7 justify-center
                  ${darkMode ? "text-gray-300" : "text-gray-600"}
                  ${
                    currentUser?.status === "busy"
                      ? darkMode
                        ? "bg-red-900 bg-opacity-30 text-red-400"
                        : "bg-red-100 text-red-600"
                      : ""
                  }
                `}
              >
                <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-red-500 mr-1"></div>
                <span className="text-xs sm:text-sm">Busy</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  });

  // Footer Component
  const Footer = () => {
    const [year, setYear] = useState(0);
    useEffect(() => {
      const currentYear = new Date().getFullYear();
      setYear(currentYear);
    }, []);

    return (
      <div
        className={`py-3 px-4 flex items-center ${
          darkMode
            ? "bg-gray-800 text-gray-300 border-gray-700"
            : "bg-white text-gray-600 border-gray-200"
        }`}
      >
        <div className="flex justify-between items-center w-full">
          <div className="text-sm">
            © {year || "2025"} ChatConnect - {users.length} users
          </div>
          {/* Rest of footer content */}
        </div>
      </div>
    );
  };

  // Login Modal Component
  const LoginModal = () => {
    return (
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 sm:p-0"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`w-full max-w-[90%] sm:max-w-md p-4 sm:p-6 rounded-lg shadow-lg mx-auto ${
                darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
              }`}
            >
              <div className="text-center mb-4 sm:mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: 0 }}
                  className="text-4xl sm:text-5xl mx-auto mb-3 sm:mb-4"
                >
                  💬
                </motion.div>
                <h2 className="text-xl sm:text-2xl font-bold">
                  Welcome to ChatConnect
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm sm:text-base">
                  Join the conversation with your team
                </p>
              </div>

              <LoginInput onLogin={handleLoginSubmit} isDarkMode={darkMode} />

              <div className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <p>
                  By joining, you agree to our{" "}
                  <span className="text-blue-500 cursor-pointer hover:underline">
                    Terms of Service
                  </span>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Settings Modal Component
  const SettingsModal = () => {
    return (
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowSettingsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`w-full max-w-md p-6 rounded-lg shadow-lg ${
                darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Settings</h2>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {currentUser && (
                  <div className="flex items-center space-x-4">
                    <Image
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-full"
                    />
                    <div>
                      <h3 className="font-bold text-lg">{currentUser.name}</h3>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <span
                          className={`h-2 w-2 rounded-full mr-2 ${
                            currentUser.status === "online"
                              ? "bg-green-500"
                              : currentUser.status === "busy"
                                ? "bg-red-500"
                                : currentUser.status === "brb"
                                  ? "bg-yellow-500"
                                  : "bg-gray-400"
                          }`}
                        ></span>
                        <span className="capitalize">{currentUser.status}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="font-medium">Status</h3>
                  <div className="flex flex-wrap gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => changeUserStatus("online")}
                      className={`px-4 py-2 rounded-full text-sm font-medium ${
                        currentUser?.status === "online"
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white"
                      }`}
                    >
                      Online
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => changeUserStatus("busy")}
                      className={`px-4 py-2 rounded-full text-sm font-medium ${
                        currentUser?.status === "busy"
                          ? "bg-red-500 text-white"
                          : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white"
                      }`}
                    >
                      Busy
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => changeUserStatus("brb")}
                      className={`px-4 py-2 rounded-full text-sm font-medium ${
                        currentUser?.status === "brb"
                          ? "bg-yellow-500 text-white"
                          : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white"
                      }`}
                    >
                      Be Right Back
                    </motion.button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Preferences</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Dark Mode</span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={toggleDarkMode}
                        className={`w-12 h-6 rounded-full flex items-center transition-colors duration-300 focus:outline-none ${
                          darkMode ? "bg-blue-500" : "bg-gray-300"
                        }`}
                      >
                        <motion.div
                          layout
                          className={`w-5 h-5 rounded-full bg-white shadow-md transform ${
                            darkMode ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </motion.button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Notification Sounds</span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={toggleNotificationSound}
                        className={`w-12 h-6 rounded-full flex items-center transition-colors duration-300 focus:outline-none ${
                          notificationSound ? "bg-blue-500" : "bg-gray-300"
                        }`}
                      >
                        <motion.div
                          layout
                          className={`w-5 h-5 rounded-full bg-white shadow-md transform ${
                            notificationSound
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </motion.button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLogout}
                    className="w-full py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 focus:outline-none transition-colors"
                  >
                    Logout
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // If not mounted (i.e., during server-side rendering), render a simple loading state
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-800">
        <div className="flex flex-col items-center">
          <div className="text-3xl mb-4">💬</div>
          <div className="text-xl font-bold">Loading chat...</div>
        </div>
      </div>
    );
  }

  // Now render the full component, which will only happen on the client

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden bg-white"
      style={{
        backgroundColor: darkMode ? "#111827" : "#ffffff",
        height: "calc(var(--vh, 1vh) * 100)", // Use CSS variable for height
        maxHeight: "100dvh",
        overflowY: "hidden",
      }}
    >
      <div
        className="flex flex-col h-full w-full overflow-hidden relative"
        style={{
          backgroundColor: darkMode ? "#111827" : "#ffffff",
          height: "100%",
          maxHeight: "100%",
          overflowY: "hidden",
        }}
      >
        {/* Fixed Top Navbar */}
        <div
          className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 relative z-30"
          style={{ opacity: 1 }}
        >
          <Navbar />
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden min-h-0 bg-white dark:bg-gray-800 relative">
          {/* Sidebar */}
          <div
            className={`md:w-64 flex-shrink-0 z-40 transform ${
              showSidebar
                ? "translate-x-0"
                : "-translate-x-full md:translate-x-0"
            } transition-transform duration-300 ease-in-out md:relative md:block absolute h-full bg-gray-50 dark:bg-gray-900`}
            style={{ opacity: 1 }}
          >
            <UserList />
          </div>

          {/* Overlay for mobile when sidebar is open */}
          {showSidebar && (
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-10"
              onClick={toggleSidebar}
            />
          )}

          {/* Chat Area */}
          <div className="flex-1 flex flex-col overflow-hidden w-full min-h-0 bg-white dark:bg-gray-800 relative">
            <ChatWindow />
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative z-30">
          <Footer />
        </div>

        {/* Render modals outside the chat container */}
        {showLoginModal && <LoginModal />}
        {showSettingsModal && <SettingsModal />}
      </div>
    </div>
  );
});

export default ChatApp;
