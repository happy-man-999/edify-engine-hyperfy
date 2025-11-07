import { css } from '@firebolt-dev/css'
import { useEffect, useRef, useState } from 'react'
import { SendHorizonalIcon, XIcon } from 'lucide-react'

// Edify icon component using the logo image
function EdifyIcon({ size = 24 }) {
  return (
    <img
      src="/edifyengine.png"
      alt="Edify"
      width={size}
      height={size}
      style={{
        display: 'block',
        objectFit: 'contain',
      }}
    />
  )
}

export function Chatbot({ world }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const pendingMessagesRef = useRef(new Map()) // Track pending messages by messageId

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 300) // Wait for animation to complete
    }
  }, [isOpen])

  // Listen for chat responses
  useEffect(() => {
    const handleChatResponse = (data) => {
      const { messageId, response, error } = data
      const pendingMessage = pendingMessagesRef.current.get(messageId)
      
      if (pendingMessage) {
        // Remove the pending message
        pendingMessagesRef.current.delete(messageId)
        
        // Update the message with the response and set timestamp to now (when response arrives)
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  text: response,
                  isLoading: false,
                  error: error || false,
                  timestamp: new Date(), // Update timestamp to when response is received
                }
              : msg
          )
        )
        setIsLoading(false)
      } else {
        // If message ID not found, still clear loading state
        setIsLoading(false)
      }
    }

    world.on('chatResponse', handleChatResponse)
    return () => {
      world.off('chatResponse', handleChatResponse)
    }
  }, [world])

  const handleSend = (e) => {
    e?.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const messageId = Date.now()
    const messageText = inputValue.trim()

    // Add user message
    const userMessage = {
      id: messageId,
      type: 'user',
      text: messageText,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Add placeholder bot message that will be updated with the response
    const botMessage = {
      id: messageId + 1,
      type: 'bot',
      text: '...',
      timestamp: new Date(),
      isLoading: true,
    }
    setMessages((prev) => [...prev, botMessage])
    pendingMessagesRef.current.set(messageId + 1, botMessage)

    // Clear input and set loading state
    setInputValue('')
    setIsLoading(true)

    // Send message to server via AI system
    world.network.send('ai', {
      name: 'chat',
      messageId: messageId + 1, // Use the bot message ID for response matching
      message: messageText,
    })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div
      className="chatbot"
      css={css`
        position: fixed;
        bottom: calc(1.5rem + env(safe-area-inset-bottom));
        right: calc(1.5rem + env(safe-area-inset-right));
        z-index: 1000;
        pointer-events: none;

        @media all and (max-width: 700px), (max-height: 700px) {
          bottom: calc(1rem + env(safe-area-inset-bottom));
          right: calc(1rem + env(safe-area-inset-right));
        }
      `}
    >
      {/* Chat Window */}
      <div
        className="chatbot-window"
        css={css`
          position: absolute;
          bottom: 4.5rem;
          right: 0;
          width: 22rem;
          max-width: calc(100vw - 2rem);
          height: 28rem;
          max-height: calc(100vh - 8rem);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          border: 1px solid rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          pointer-events: auto;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;

          /* Animation */
          opacity: ${isOpen ? 1 : 0};
          transform: ${isOpen ? 'translateY(0) scale(1)' : 'translateY(1rem) scale(0.95)'};
          visibility: ${isOpen ? 'visible' : 'hidden'};
          transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
            transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s;

          @media all and (max-width: 700px), (max-height: 700px) {
            width: calc(100vw - 2rem);
            height: calc(100vh - 6rem);
            max-height: calc(100vh - 6rem);
          }
        `}
      >
        {/* Header */}
        <div
          css={css`
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            background: rgba(248, 249, 250, 0.8);
          `}
        >
          <div
            css={css`
              display: flex;
              align-items: center;
              gap: 0.5rem;
              color: #1a1a1a;
              font-weight: 600;
              font-size: 1rem;
            `}
          >
            <EdifyIcon size={20} />
            <span>Integrated GPT</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            css={css`
              background: transparent;
              border: none;
              color: rgba(0, 0, 0, 0.6);
              cursor: pointer;
              padding: 0.25rem;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 0.25rem;
              transition: all 0.2s;

              &:hover {
                background: rgba(0, 0, 0, 0.05);
                color: #1a1a1a;
              }
            `}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Messages */}
        <div
          css={css`
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            user-select: text;
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;

            /* Scrollbar styling */
            &::-webkit-scrollbar {
              width: 6px;
            }
            &::-webkit-scrollbar-track {
              background: transparent;
            }
            &::-webkit-scrollbar-thumb {
              background: rgba(0, 0, 0, 0.2);
              border-radius: 3px;
            }
            &::-webkit-scrollbar-thumb:hover {
              background: rgba(0, 0, 0, 0.3);
            }
          `}
        >
          {messages.length === 0 ? (
            <div
              css={css`
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: rgba(0, 0, 0, 0.6);
                text-align: center;
                gap: 0.5rem;
              `}
            >
              <EdifyIcon size={32} />
              <p>Hi! How can I help you today?</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                css={css`
                  display: flex;
                  flex-direction: column;
                  gap: 0.25rem;
                  align-self: ${message.type === 'user' ? 'flex-end' : 'flex-start'};
                  max-width: 80%;
                `}
              >
                <div
                  css={css`
                    padding: 0.75rem 1rem;
                    border-radius: 1rem;
                    background: ${message.type === 'user'
                      ? 'rgba(66, 103, 125, 1)'
                      : message.error
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'rgba(0, 0, 0, 0.05)'};
                    color: ${message.type === 'user' ? 'white' : message.error ? '#dc2626' : '#1a1a1a'};
                    border: ${message.error ? '1px solid rgba(239, 68, 68, 0.3)' : 'none'};
                    font-size: 0.875rem;
                    line-height: 1.5;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    white-space: pre-wrap;
                    user-select: text;
                    -webkit-user-select: text;
                    -moz-user-select: text;
                    -ms-user-select: text;
                    cursor: text;
                  `}
                >
                  {message.isLoading ? (
                    <span
                      css={css`
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                      `}
                    >
                      <span
                        css={css`
                          display: inline-block;
                          width: 8px;
                          height: 8px;
                          border-radius: 50%;
                          background: currentColor;
                          animation: pulse 1.4s ease-in-out infinite;

                          @keyframes pulse {
                            0%,
                            100% {
                              opacity: 1;
                              transform: scale(1);
                            }
                            50% {
                              opacity: 0.5;
                              transform: scale(0.8);
                            }
                          }
                        `}
                      />
                      <span
                        css={css`
                          display: inline-block;
                          width: 8px;
                          height: 8px;
                          border-radius: 50%;
                          background: currentColor;
                          animation: pulse 1.4s ease-in-out infinite 0.2s;
                        `}
                      />
                      <span
                        css={css`
                          display: inline-block;
                          width: 8px;
                          height: 8px;
                          border-radius: 50%;
                          background: currentColor;
                          animation: pulse 1.4s ease-in-out infinite 0.4s;
                        `}
                      />
                    </span>
                  ) : (
                    message.text
                  )}
                </div>
                <div
                  css={css`
                    font-size: 0.75rem;
                    color: rgba(0, 0, 0, 0.5);
                    padding: 0 0.5rem;
                    user-select: text;
                    -webkit-user-select: text;
                    -moz-user-select: text;
                    -ms-user-select: text;
                  `}
                >
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          css={css`
            display: flex;
            gap: 0.5rem;
            padding: 1rem;
            border-top: 1px solid rgba(0, 0, 0, 0.1);
            background: rgba(248, 249, 250, 0.8);
          `}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? "Waiting for response..." : "Type your message..."}
            disabled={isLoading}
            css={css`
              flex: 1;
              background: white;
              border: 1px solid rgba(0, 0, 0, 0.15);
              border-radius: 0.5rem;
              padding: 0.75rem 1rem;
              color: #1a1a1a;
              font-size: 0.875rem;
              outline: none;
              transition: all 0.2s;

              &::placeholder {
                color: rgba(0, 0, 0, 0.5);
              }

              &:focus {
                background: white;
                border-color: rgba(66, 103, 125, 1);
                box-shadow: 0 0 0 3px rgba(66, 103, 125, 0.1);
              }
            `}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            css={css`
              background: rgba(66, 103, 125, 1);
              border: none;
              border-radius: 0.5rem;
              padding: 0.75rem;
              color: white;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s;

              &:hover:not(:disabled) {
                background: rgba(53, 82, 99, 1);
                transform: scale(1.05);
              }

              &:disabled {
                opacity: 0.5;
                cursor: not-allowed;
              }
            `}
          >
            <SendHorizonalIcon size={18} />
          </button>
        </form>
      </div>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        css={css`
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 50%;
          background: white;
          border: 2px solid rgba(66, 103, 125, 0.2);
          color: #1a1a1a;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          pointer-events: auto;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;

          &:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
            border-color: rgba(66, 103, 125, 0.4);
          }

          &:active {
            transform: scale(0.95);
          }

          /* Pulse animation when closed */
          ${!isOpen &&
          css`
            &::before {
              content: '';
              position: absolute;
              inset: -2px;
              border-radius: 50%;
              background: rgba(66, 103, 125, 0.1);
              animation: pulse 2s ease-in-out infinite;
            }

            @keyframes pulse {
              0%,
              100% {
                opacity: 1;
                transform: scale(1);
              }
              50% {
                opacity: 0.5;
                transform: scale(1.1);
              }
            }
          `}

          /* Icon rotation when open */
          svg {
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform: ${isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
          }

          /* X icon color when open */
          svg[stroke] {
            stroke: ${isOpen ? '#1a1a1a' : 'currentColor'};
          }
        `}
      >
        {isOpen ? <XIcon size={24} /> : <EdifyIcon size={24} />}
      </button>
    </div>
  )
}

