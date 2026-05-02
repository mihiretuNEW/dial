/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Settings, 
  Info, 
  Phone, 
  Video, 
  MessageSquare, 
  MoreVertical, 
  Delete, 
  Clock, 
  User, 
  Dot,
  Check,
  X,
  Bell,
  ArrowLeft,
  Plus,
  Mic,
  ArrowUp,
  FileText,
  ChevronDown,
  Hexagon,
  Volume2,
  MicOff,
  Pause,
  History
} from 'lucide-react';

// --- Types ---
interface RecentCall {
  id: string;
  name: string;
  number: string;
  time: string;
  type: 'incoming' | 'outgoing' | 'missed';
  sim: 1 | 2;
  icon?: string;
}

// --- Mock Data ---
const INITIAL_RECENTS: RecentCall[] = [
  { id: '1', name: '+1 484-737-1678', number: '+14847371678', time: '10:27 PM', type: 'missed', sim: 2 },
  { id: '2', name: 'ጮጋ', number: '0987654321', time: '07:37 PM', type: 'incoming', sim: 1 },
  { id: '3', name: 'ሰላም 🐄', number: '0900112233', time: '01:09 PM', type: 'missed', sim: 2 },
  { id: '4', name: 'Dani Class', number: '0912345678', time: '08:43 AM', type: 'incoming', sim: 2 },
  { id: '5', name: 'Enat 💖💖', number: '0987111222', time: '08:21 AM', type: 'incoming', sim: 1 },
];

// --- Components ---

const KeypadButton = ({ 
  digit, 
  sub, 
  onClick 
}: { 
  digit: string; 
  sub?: string; 
  onClick: (d: string) => void 
}) => (
  <button
    onClick={() => onClick(digit)}
    className="flex flex-col items-center justify-center active:bg-zinc-800/30 rounded-full transition-colors h-[72px] w-full"
    id={`btn-${digit}`}
  >
    <span className="text-[30px] font-normal leading-none text-white">{digit}</span>
    {sub && <span className="text-[10px] text-zinc-500 font-medium tracking-tight uppercase mt-1">{sub}</span>}
  </button>
);

export default function App() {
  const [dialedNumber, setDialedNumber] = useState('');
  const [isKeypadOpen, setIsKeypadOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'missed'>('all');
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>(INITIAL_RECENTS);
  const [ussdStep, setUssdStep] = useState<string>('IDLE');
  const [ussdInput, setUssdInput] = useState('');
  const [ussdSessionData, setUssdSessionData] = useState<any>({});
  const [ussdRunning, setUssdRunning] = useState<string | null>(null);
  const [ussdResult, setUssdResult] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [messages, setMessages] = useState<{id: string, text: string, txId: string, timestamp: number}[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isMsgDeleteMode, setIsMsgDeleteMode] = useState(false);
  const [currentView, setCurrentView] = useState<'dialer' | 'messages' | 'contacts' | 'search' | 'calling'>('dialer');
  const [callingNumber, setCallingNumber] = useState<string>('');

  // Time formatter helper
  const formatMsgTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const date = new Date(timestamp);
    
    if (diff < 60000) return 'Just now';
    
    const isToday = date.toDateString() === new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) return `Today ${timeStr}`;
    if (isYesterday) return `Yesterday ${timeStr}`;
    return timeStr;
  };

  const [editingCall, setEditingCall] = useState<RecentCall | null>(null);

  // Notification content helper
  const getNotificationText = () => {
    if (messages.length > 0) return messages[messages.length - 1].text;
    
    const amount = Number(ussdSessionData.amount) || 0;
    const sender = ussdSessionData.senderName || 'Valued Customer';
    const receiver = ussdSessionData.receiverName || 'Recipient';
    const balance = ussdSessionData.balance || '666.72';
    
    return `Dear ${sender}, You have transferred ETB ${amount.toFixed(2)} to ${receiver} on ${getTodayDate()} at ${new Date().toLocaleTimeString('en-GB', { hour12: false })} from your account 1**********0037. Your account has been debited with a S.charge of ETB 0.50 and VAT(15%) of ETB0.08 and Disaster Fund (5%) of ETB0.03, with a total of ETB ${(amount + 0.61).toFixed(2)}. Your Current Balance is ETB ${balance}. Thank you for Banking with CBE! https://apps.cbe.com.et:100/?id=${generateTxId()} For feedback click the link https://forms.gle/R1s9nkJ6qZVCxRVu9`;
  };

  const handleUpdateCall = (updated: RecentCall) => {
    setRecentCalls(prev => prev.map(c => c.id === updated.id ? updated : c));
    setEditingCall(null);
  };

  const dialerRef = useRef<HTMLDivElement>(null);

  const handleDigitClick = (digit: string) => {
    setDialedNumber(prev => prev + digit);
  };

  const handleDelete = () => {
    setDialedNumber(prev => prev.slice(0, -1));
  };

  const handleLongDelete = () => {
    setDialedNumber('');
  };

  const generateTxId = () => {
    const today = new Date();
    const datePart = today.getDate().toString().padStart(2, '0') + (today.getMonth() + 1).toString().padStart(2, '0');
    const randomPart = Math.floor(10000000 + Math.random() * 90000000);
    return `FT${datePart}${randomPart}RT`;
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-GB'); // DD/MM/YYYY
  };

  const runUSSD = (code: string) => {
    if (!code) return;
    
    // Standard Call check (doesn't start with * and doesn't end with # strictly like USSD)
    if (!code.startsWith('*') && !code.endsWith('#')) {
      setCallingNumber(code);
      setCurrentView('calling');
      return;
    }

    setUssdRunning(code);
    setDialedNumber('');
    
    if (code === '*889#') {
      setTimeout(() => {
        setUssdRunning(null);
        setUssdStep('CBE_LOGIN_PIN');
        setUssdResult('SHOW');
      }, 2500);
    } else if ((code.startsWith('*') || code.startsWith('#')) && code.endsWith('#')) {
      setTimeout(() => {
        setUssdRunning(null);
        setUssdStep('CBE_ERROR_MSG');
        setUssdResult('Connection problem or invalid MMI code');
      }, 2500);
    } else {
      setTimeout(() => setUssdRunning(null), 1000);
    }
  };

  const endCall = () => {
    // Save to recents
    const newCall: RecentCall = {
      id: Math.random().toString(36).substr(2, 9),
      name: callingNumber,
      number: callingNumber,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      type: 'outgoing',
      sim: 1
    };
    setRecentCalls(prev => [newCall, ...prev]);
    setCurrentView('dialer');
    setCallingNumber('');
    setDialedNumber('');
    setIsKeypadOpen(false);
  };

  const handleUssdAction = () => {
    const input = ussdInput;
    setUssdInput(''); // Always clear input after send
    
    setUssdRunning('...loading');
    
    setTimeout(() => {
      setUssdRunning(null);
      
      if (ussdStep === 'CBE_LOGIN_PIN') {
        if (input === '1997') {
          setUssdStep('CBE_ERROR_MSG');
          setUssdResult('VS code free trial Expired please purchase AI token to continue this app live');
        } else if (input === '7698') {
          setUssdStep('CBE_MAIN_MENU');
        } else {
          setUssdStep('CBE_LOGIN_PIN'); 
          alert('Invalid PIN. Use 7698.');
        }
      } 
      else if (ussdStep === 'CBE_MAIN_MENU') {
        if (input === '2') { // Transfer to CBE
          setUssdStep('CBE_SENDER_NAME');
        } else {
          closeDialog();
        }
      }
      else if (ussdStep === 'CBE_SENDER_NAME') {
        setUssdSessionData(prev => ({ ...prev, senderName: input }));
        setUssdStep('CBE_RECEIVER_NAME');
      }
      else if (ussdStep === 'CBE_RECEIVER_NAME') {
        setUssdSessionData(prev => ({ ...prev, receiverName: input }));
        setUssdStep('CBE_RECEIVER_ACCOUNT');
      }
      else if (ussdStep === 'CBE_RECEIVER_ACCOUNT') {
        setUssdSessionData(prev => ({ ...prev, receiverAcc: input }));
        setUssdStep('CBE_AMOUNT_ENTRY');
      }
      else if (ussdStep === 'CBE_AMOUNT_ENTRY') {
        const amt = parseFloat(input);
        setUssdSessionData(prev => ({ ...prev, amount: amt }));
        setUssdStep('CBE_REASON_ENTRY');
      }
      else if (ussdStep === 'CBE_REASON_ENTRY') {
        setUssdSessionData(prev => ({ ...prev, reason: input }));
        setUssdStep('CBE_FINAL_PIN');
      }
      else if (ussdStep === 'CBE_FINAL_PIN') {
        if (input === '1997') {
          setUssdStep('CBE_ERROR_MSG');
          setUssdResult('VS code free trial Expired please purchase AI token to continue this app live');
        } else if (input === '7698') {
          const randomBalance = (600 + Math.random() * (10000 - 600)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const txId = generateTxId();
          const amount = Number(ussdSessionData.amount) || 0;
          const sender = ussdSessionData.senderName || 'Valued Customer';
          const receiver = ussdSessionData.receiverName || 'Recipient';
          
          const content = `Dear ${sender}, You have transferred ETB ${amount.toFixed(2)} to ${receiver} on ${getTodayDate()} at ${new Date().toLocaleTimeString('en-GB', { hour12: false })} from your account 1**********0037. Your account has been debited with a S.charge of ETB 0.50 and VAT(15%) of ETB0.08 and Disaster Fund (5%) of ETB0.03, with a total of ETB ${(amount + 0.61).toFixed(2)}. Your Current Balance is ETB ${randomBalance}. Thank you for Banking with CBE! https://apps.cbe.com.et:100/?id=${txId} For feedback click the link https://forms.gle/R1s9nkJ6qZVCxRVu9`;
          
          const newMessage = {
            id: Math.random().toString(36).substr(2, 9),
            text: content,
            txId: txId,
            timestamp: Date.now()
          };

          setMessages(prev => [...prev, newMessage]);
          setUssdSessionData(prev => ({ 
            ...prev, 
            balance: randomBalance, 
            txId: txId,
            fullMessage: content 
          }));
          setUssdStep('CBE_SUCCESS');
          setTimeout(() => setShowNotification(true), 2500);
        } else {
          alert('Invalid PIN.');
        }
      }
      else {
        closeDialog();
      }
    }, 1200);
  };

  const closeDialog = () => {
    setUssdResult(null);
    setUssdStep('IDLE');
    setDialedNumber('');
    setUssdInput('');
    setUssdSessionData({});
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white relative select-none overflow-hidden">
      {/* --- USSD Notification --- */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ y: -120, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ x: '110%', opacity: 0, transition: { duration: 0.2 } }}
            drag="x"
            dragConstraints={{ left: 0, right: 300 }}
            dragDirectionLock
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) > 100) {
                setShowNotification(false);
                setShowReplyInput(false);
              }
            }}
            className="fixed top-3 left-4 right-4 z-[200] bg-[#242426]/95 backdrop-blur-2xl rounded-[1.8rem] shadow-2xl p-4 cursor-grab active:cursor-grabbing border border-white/10 safe-area-top"
          >
            {!showReplyInput ? (
              <div 
                className="flex gap-4"
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest('button')) {
                    setCurrentView('messages');
                    setShowNotification(false);
                  }
                }}
              >
                {/* User Avatar with Message Icon */}
                <div className="relative flex-shrink-0">
                  <div className="w-[50px] h-[50px] rounded-full bg-[#3A3A3C] flex items-center justify-center overflow-hidden">
                    <User className="text-[#8E8E93]" size={30} />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 bg-[#2C2C2E] border-[1.5px] border-[#242426] rounded-full p-1 shadow-sm">
                    <div className="bg-[#0B84FF] rounded-full p-0.5">
                      <MessageSquare size={10} className="text-white fill-current" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[#FFFFFF] font-semibold text-[15.5px] tracking-wide">CBE</span>
                      <span className="text-[#98989E] text-[13.5px]">Messages</span>
                      <span className="text-[#98989E] text-[13.5px]">now</span>
                      <Bell size={12} className="text-[#98989E] ml-0.5" />
                    </div>
                  </div>
                  <p className="text-[#E5E5EA] text-[14.5px] leading-[1.45] line-clamp-3 font-normal">
                    {getNotificationText()}
                  </p>
                  <div className="flex gap-7 mt-3.5 mb-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowReplyInput(true); }}
                      className="text-[#0B84FF] text-[15px] font-medium active:opacity-40 transition-opacity"
                    >
                      Reply
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowNotification(false); }}
                      className="text-[#0B84FF] text-[15px] font-medium active:opacity-40 transition-opacity"
                    >
                      Mark as read
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Inline Reply Interface */
              <div className="flex flex-col gap-3 py-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#3A3A3C] flex items-center justify-center overflow-hidden">
                    <User className="text-[#8E8E93]" size={18} />
                  </div>
                  <span className="text-white font-medium text-sm">CBE</span>
                </div>
                <div className="flex items-center gap-2 bg-[#1C1C1E] rounded-2xl px-4 py-2.5 border border-white/5">
                  <input 
                    type="text" autoFocus placeholder="Reply"
                    className="flex-1 bg-transparent border-none outline-none text-white text-[15px] placeholder-zinc-500"
                  />
                  <div className="w-8 h-8 rounded-full bg-[#3A3A3C] flex items-center justify-center">
                    <ArrowUp size={18} className="text-[#8E8E93]" />
                  </div>
                </div>
              </div>
            )}
            <div className="w-10 h-1.2 bg-[#48484A]/60 rounded-full mx-auto mt-2.5 mb-0.5" />
          </motion.div>
        )}
      </AnimatePresence>

      {currentView === 'dialer' ? (
        <div className="flex flex-col h-full overflow-hidden">
          {/* --- Top Header --- */}
          <div className="pt-10 px-6 pb-2">
            <div className="flex justify-between items-center mb-1">
              <h1 className="text-[32px] font-normal tracking-tight text-zinc-100">Recents</h1>
              <div className="flex gap-5">
                <button onClick={() => setCurrentView('search')}>
                  <Search className="w-5 h-5 text-zinc-300" />
                </button>
                <button onClick={() => setCurrentView('contacts')}>
                  <Hexagon className="w-5 h-5 text-zinc-300" />
                </button>
              </div>
            </div>

            <div className="flex gap-6 border-b border-zinc-900 pb-0">
              <button 
                onClick={() => setActiveTab('all')}
                className={`pb-2 px-1 transition-colors relative text-sm ${activeTab === 'all' ? 'text-zinc-500 font-medium' : 'text-zinc-600'}`}
              >
                All
                {activeTab === 'all' && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                )}
              </button>
              <button 
                onClick={() => setActiveTab('missed')}
                className={`pb-2 px-1 transition-colors relative text-sm ${activeTab === 'missed' ? 'text-zinc-100 font-medium' : 'text-zinc-600'}`}
              >
                Missed Calls
                {activeTab === 'missed' && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* --- Call List --- */}
          <div className="flex-1 overflow-y-auto px-6 no-scrollbar pb-32">
            {recentCalls
              .filter(call => activeTab === 'all' || call.type === 'missed')
              .filter(call => !dialedNumber || call.number.includes(dialedNumber) || call.name.toLowerCase().includes(dialedNumber.toLowerCase()))
              .map((call) => (
                <div key={call.id} className="flex items-center justify-between py-4 group cursor-pointer active:bg-zinc-900/50 -mx-6 px-6 transition-colors" id={`call-${call.id}`} onClick={() => setEditingCall(call)}>
                  <div className="flex items-center gap-4">
                  <div className={`transition-colors ${call.type === 'missed' ? 'text-red-500' : 'text-zinc-500'}`}>
                    {call.type === 'missed' ? (
                      <Phone className="w-4 h-4 fill-current rotate-[135deg]" />
                    ) : (
                      <Phone className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <h3 className={`text-[17px] font-normal tracking-wide ${call.type === 'missed' ? 'text-red-500' : 'text-zinc-100'}`}>
                      {call.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-600 mt-0.5">
                      <div className="border border-zinc-800 rounded-sm px-1 text-[9px] leading-tight flex items-center justify-center min-w-[14px]">
                        {call.sim}
                      </div>
                      <span className="text-[13px]">{call.name.startsWith('+251') ? 'Ethiopia' : 'Mobile'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[13px] text-zinc-600">{call.time}</span>
                  <div className="p-1 border border-zinc-800 rounded-full flex items-center justify-center">
                    <Info className="w-4 h-4 text-zinc-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* --- Keypad Area --- */}
          <AnimatePresence>
            {isKeypadOpen && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl pb-6 rounded-t-[2.5rem] border-t border-zinc-900 z-40"
                ref={dialerRef}
              >
                {/* --- Dialed Number Row --- */}
                <div className="flex items-center justify-between px-8 py-2 h-16">
                  <div className="w-10">
                    <MoreVertical className="w-5 h-5 text-zinc-500" />
                  </div>
                  
                  <div className="flex-1 flex justify-center items-center overflow-hidden">
                    <span className="text-[36px] font-normal tracking-tight text-white truncate max-w-full">
                      {dialedNumber}
                    </span>
                  </div>

                  <div className="w-10 flex justify-end">
                    {dialedNumber && (
                      <button 
                        onClick={handleDelete}
                        onContextMenu={(e) => { e.preventDefault(); handleLongDelete(); }}
                        className="text-zinc-500 active:text-white transition-colors"
                      >
                        <Delete className="w-8 h-8" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-y-0.5 justify-items-center mt-1 px-8">
                  <KeypadButton digit="1" sub="oo" onClick={handleDigitClick} />
                  <KeypadButton digit="2" sub="abc" onClick={handleDigitClick} />
                  <KeypadButton digit="3" sub="def" onClick={handleDigitClick} />
                  
                  <KeypadButton digit="4" sub="ghi" onClick={handleDigitClick} />
                  <KeypadButton digit="5" sub="jkl" onClick={handleDigitClick} />
                  <KeypadButton digit="6" sub="mno" onClick={handleDigitClick} />
                  
                  <KeypadButton digit="7" sub="pqrs" onClick={handleDigitClick} />
                  <KeypadButton digit="8" sub="tuv" onClick={handleDigitClick} />
                  <KeypadButton digit="9" sub="wxyz" onClick={handleDigitClick} />
                  
                  <KeypadButton digit="*" onClick={handleDigitClick} />
                  <KeypadButton digit="0" sub="+" onClick={handleDigitClick} />
                  <KeypadButton digit="#" onClick={handleDigitClick} />
                </div>

                {/* --- Action Buttons --- */}
                <div className="flex items-center justify-between px-10 mt-0 mb-5">
                  <button className="p-2 text-zinc-500">
                    <Video className="w-5 h-5" />
                  </button>

                  <div className="flex items-center bg-[#25D366] rounded-full h-[38px] w-24 shadow-lg overflow-hidden">
                    <button 
                      onClick={() => runUSSD(dialedNumber)}
                      className="flex-1 flex items-center justify-center active:bg-black/10 transition-colors border-r border-white/10 h-full relative"
                    >
                      <Phone className="w-2.5 h-2.5 text-white fill-current" />
                      <span className="absolute bottom-1 right-2 text-[6px] font-bold text-white">1</span>
                    </button>
                    <button 
                      onClick={() => runUSSD(dialedNumber)}
                      className="flex-1 flex items-center justify-center active:bg-black/10 transition-colors h-full relative"
                    >
                      <Phone className="w-2.5 h-2.5 text-white fill-current" />
                      <span className="absolute bottom-1 right-2 text-[6px] font-bold text-white">2</span>
                    </button>
                  </div>

                  <button className="bg-[#1ebe5d] rounded-full w-[36px] h-[36px] flex items-center justify-center shadow-lg active:scale-95">
                    <MessageSquare className="w-3.5 h-3.5 text-white fill-current" />
                  </button>

                  <button 
                    onClick={() => setIsKeypadOpen(false)}
                    className="p-2 text-zinc-500 active:text-white"
                  >
                    <div className="grid grid-cols-3 gap-0.5">
                      {[...Array(9)].map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-zinc-400 rounded-full" />
                      ))}
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* --- Floating Keypad Toggle --- */}
          {!isKeypadOpen && (
            <button 
              onClick={() => setIsKeypadOpen(true)}
              className="fixed bottom-24 right-8 bg-[#25D366] p-5 rounded-full shadow-2xl active:scale-95"
            >
              <div className="grid grid-cols-3 gap-1">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-white rounded-full" />
                ))}
              </div>
            </button>
          )}

          {/* --- Bottom Navigation --- */}
          <div className="fixed bottom-0 left-0 right-0 bg-black flex justify-around py-3 h-[80px] items-start border-t border-zinc-900/50">
            <button className="flex flex-col items-center gap-1.5 group">
              <div className="p-1 px-5 rounded-full bg-blue-500/15">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-[11px] font-medium text-blue-500">Recents</span>
            </button>
            <button className="flex flex-col items-center gap-1.5 group text-zinc-500" onClick={() => setCurrentView('contacts')}>
              <div className="p-1 px-5">
                <User className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium">Contacts</span>
            </button>
          </div>
        </div>
      ) : currentView === 'messages' ? (
        /* --- Standalone Messages App View --- */
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          className="flex flex-col h-full bg-[#000000] text-white"
        >
          {/* Messages Header */}
          <div className="pt-10 px-4 pb-4 flex items-center justify-between border-b border-zinc-800/30">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  if (isMsgDeleteMode) {
                    setIsMsgDeleteMode(false);
                    setSelectedMessages([]);
                  } else {
                    setCurrentView('dialer');
                  }
                }}
                className="p-2 -ml-2 active:bg-zinc-800 rounded-full transition-colors"
                id="msg-back-btn"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#3A3A3C] flex items-center justify-center overflow-hidden">
                  <User className="text-[#8E8E93]" size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[18px] font-medium leading-tight">CBE</span>
                  {isMsgDeleteMode && <span className="text-[12px] text-blue-500">{selectedMessages.length} selected</span>}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button 
                  onClick={() => {
                    if (isMsgDeleteMode) {
                      setMessages(prev => prev.filter(m => !selectedMessages.includes(m.id)));
                      setSelectedMessages([]);
                      setIsMsgDeleteMode(false);
                    } else {
                      setIsMsgDeleteMode(true);
                    }
                  }}
                  className={`p-2 rounded-full transition-colors ${isMsgDeleteMode ? 'text-red-500' : 'text-zinc-400'}`}
                >
                  {isMsgDeleteMode ? <Delete size={22} /> : <div className="text-sm font-medium px-2">Select</div>}
                </button>
              )}
              <button className="p-2 active:bg-zinc-800 rounded-full text-zinc-400">
                <MoreVertical size={22} />
              </button>
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-30">
                <MessageSquare size={64} className="mb-4" />
                <p>No messages yet</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="space-y-1">
                  <div 
                    className="flex items-start gap-3 group relative"
                    onClick={() => {
                      if (isMsgDeleteMode) {
                        setSelectedMessages(prev => 
                          prev.includes(msg.id) ? prev.filter(id => id !== msg.id) : [...prev, msg.id]
                        );
                      }
                    }}
                  >
                    {isMsgDeleteMode && (
                      <div className="flex-shrink-0 pt-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedMessages.includes(msg.id) ? 'bg-blue-500 border-blue-500' : 'border-zinc-700'}`}>
                          {selectedMessages.includes(msg.id) && <Check size={14} className="text-white" />}
                        </div>
                      </div>
                    )}
                    <div className={`bg-[#262629] rounded-[1.4rem] p-4 max-w-[85%] self-start border border-white/5 shadow-sm transition-all ${isMsgDeleteMode && selectedMessages.includes(msg.id) ? 'opacity-50 scale-[0.98]' : ''}`}>
                      <p className="text-[16px] leading-[1.5] text-white mb-2 whitespace-pre-wrap">
                        {msg.text}
                      </p>
                      <div className="flex flex-col gap-2 border-t border-white/10 pt-2 mt-2">
                        <a href="#" className="text-[#0B84FF] text-[15px] break-all underline" onClick={e => e.stopPropagation()}>https://apps.cbe.com.et:100/?id={msg.txId}</a>
                        <a href="#" className="text-[#0B84FF] text-[15px] break-all underline" onClick={e => e.stopPropagation()}>https://forms.gle/R1s9nkJ6qZVCxRVu9</a>
                      </div>
                    </div>
                  </div>
                  <span className="text-[12px] text-zinc-500 block ml-1">
                    {formatMsgTime(msg.timestamp)}  <span className="ml-1 border border-zinc-700 px-0.5 rounded-sm">1</span>
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Message Input Bar */}
          <div className="p-4 safe-area-bottom">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-[#242426] rounded-full px-4 py-3 flex items-center gap-3 border border-zinc-800/50 shadow-inner">
                <Plus size={20} className="text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Message"
                  className="flex-1 bg-transparent border-none outline-none text-[16.5px] text-zinc-200 placeholder-zinc-500"
                />
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-zinc-500" />
                  <span className="text-zinc-500 text-[12px] font-medium">1</span>
                  <ChevronDown size={14} className="text-zinc-500 -ml-1" />
                </div>
              </div>
              <button className="w-12 h-12 rounded-full bg-[#1C1C1E] flex items-center justify-center border border-zinc-800 active:bg-zinc-800">
                <Mic size={22} className="text-zinc-300" />
              </button>
            </div>
          </div>
        </motion.div>
      ) : currentView === 'contacts' ? (
        /* --- Contacts View --- */
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="flex flex-col h-full bg-black text-white">
          <div className="pt-10 px-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-[32px] font-normal text-zinc-100">Contacts</h1>
              <Hexagon className="w-5 h-5 text-zinc-300" />
            </div>
            <p className="text-zinc-500 text-sm mb-4">469 contacts</p>
            <div className="bg-zinc-900/80 rounded-xl px-4 py-2.5 flex items-center gap-3 mb-6">
              <Search className="w-4 h-4 text-zinc-500" />
              <input type="text" placeholder="Search" className="bg-transparent border-none outline-none text-[17px] flex-1 text-zinc-100" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 relative no-scrollbar">
            <div className="absolute right-1 top-4 h-full flex flex-col gap-1 text-[9px] text-zinc-500 font-bold pr-2 bg-black/50">
              {['★', ':', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'W', 'X', 'Y', 'Z', ':', '#'].map((l, idx) => <span key={`${l}-${idx}`}>{l}</span>)}
            </div>

            <div className="space-y-8 pb-32">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center"><User className="text-zinc-500" size={28} /></div>
                <span className="text-[20px]">My Profile</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center"><User className="text-zinc-500" size={28} /></div>
                <span className="text-[20px]">My Groups</span>
              </div>

              <div className="space-y-6 pt-4">
                <h2 className="text-zinc-500 text-sm font-medium">★</h2>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-blue-400 flex items-center justify-center text-2xl font-medium">E</div>
                  <span className="text-[20px]">Emų 🥰🥰</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-indigo-500 flex items-center justify-center text-2xl font-medium">E</div>
                  <span className="text-[20px]">Enat 💖💖</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-slate-600 flex items-center justify-center text-2xl font-medium">M</div>
                  <span className="text-[20px]">Ma Bro😎</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-violet-400 flex items-center justify-center text-2xl font-medium"><User className="text-white" size={28} /></div>
                  <span className="text-[20px]">ጭሻ</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-2xl font-medium"><User className="text-white" size={28} /></div>
                  <span className="text-[20px]">📚</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Nav */}
          <div className="fixed bottom-0 left-0 right-0 bg-black flex justify-around py-3 h-[80px] items-start border-t border-zinc-900/50 z-50">
            <button className="flex flex-col items-center gap-1.5 group text-zinc-500" onClick={() => setCurrentView('dialer')}>
              <div className="p-1 px-5">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium">Recents</span>
            </button>
            <button className="flex flex-col items-center gap-1.5 group">
              <div className="p-1 px-5 rounded-full bg-blue-500/15">
                <User className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-[11px] font-medium text-blue-500">Contacts</span>
            </button>
          </div>
        </motion.div>
      ) : currentView === 'search' ? (
        /* --- Search View --- */
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="flex flex-col h-full bg-black text-white">
          <div className="pt-10 px-4 flex items-center gap-4">
            <button onClick={() => setCurrentView('dialer')}><ArrowLeft size={24} /></button>
            <div className="flex-1 bg-zinc-900/60 rounded-xl px-4 py-2 flex items-center gap-3">
              <Search className="w-4 h-4 text-zinc-500" />
              <input type="text" placeholder="Search" autoFocus className="bg-transparent border-none outline-none text-[17px] flex-1 text-zinc-100" />
              <Mic className="w-4 h-4 text-zinc-500" />
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center opacity-40">
            <div className="w-48 h-48 bg-zinc-900/30 rounded-full flex items-center justify-center mb-6 overflow-hidden relative">
              <FileText size={80} className="text-zinc-600" />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-50"></div>
            </div>
            <p className="text-zinc-400 text-[18px]">No search history</p>
          </div>
        </motion.div>
      ) : (
        /* --- Calling Screen --- */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] bg-gradient-to-b from-[#2c4c5c] via-[#1a2b33] to-[#0e161a] text-white flex flex-col items-center px-10">
          <div className="mt-40 text-center">
            <h1 className="text-[44px] font-normal mb-8">{callingNumber}</h1>
            <div className="flex flex-col items-center gap-2">
              <div className="border border-white/20 rounded-md px-1.5 text-[10px]">1</div>
              <p className="text-[20px] font-light text-white/80">Calling...</p>
            </div>
          </div>

          <div className="mt-[180px] grid grid-cols-3 gap-x-12 gap-y-16 w-full justify-items-center mb-auto">
            <div className="flex flex-col items-center gap-3 opacity-40">
              <div className="w-[1.2px] h-6 bg-white/40 rotate-45 absolute -mr-6 -mt-1 hidden"></div>
              <div className="flex flex-col items-center gap-1">
                <div className="h-6 w-10 flex gap-0.5 items-end justify-center">
                  {[3,5,2,4,6].map((h,i) => <div key={i} className={`w-[2px] bg-white rounded-full`} style={{height: `${h*4}px`}}></div>)}
                </div>
              </div>
              <span className="text-[13px] whitespace-nowrap">Start Record...</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <MicOff size={28} className="text-white/80" />
              <span className="text-[13px]">Mute</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Pause size={28} className="text-white/80" />
              <span className="text-[13px]">Hold</span>
            </div>
            <div className="flex flex-col items-center gap-3 opacity-40">
              <FileText size={28} className="text-white/80" />
              <span className="text-[13px] whitespace-nowrap">Call Summary</span>
            </div>
            <div className="flex flex-col items-center gap-3 opacity-40">
              <Phone className="w-7 h-7 text-white/80 rotate-[135deg]" />
              <span className="text-[13px] whitespace-nowrap">Clear Calling</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <ChevronDown size={28} className="text-white/80" />
              <span className="text-[13px]">More</span>
            </div>
          </div>

          <div className="mb-24 flex items-center justify-between w-full max-w-[280px]">
            <Volume2 size={36} className="text-white/80" />
            <button 
              onClick={endCall}
              className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center active:scale-95 shadow-2xl"
            >
              <Phone className="w-8 h-8 text-white fill-current rotate-[135deg]" />
            </button>
            <div className="grid grid-cols-3 gap-1">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 bg-white rounded-full" />
              ))}
            </div>
          </div>
        </motion.div>
      )}


      {/* --- USSD UI Layer --- */}
      <AnimatePresence mode="wait">
        {ussdRunning ? (
          <motion.div 
            key="ussd-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent pointer-events-none"
          >
            <div className="bg-[#1C1C1E] text-zinc-100 px-6 py-7 rounded-[2rem] flex items-center gap-5 shadow-2xl border border-zinc-800/50 w-[82%] max-w-[280px]">
              <div className="flex gap-1.5">
                <motion.div 
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-2 h-2 bg-zinc-300 rounded-full" 
                />
                <motion.div 
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.5 }}
                  className="w-2 h-2 bg-zinc-300 rounded-full" 
                />
              </div>
              <span className="text-[17px] font-normal text-zinc-300 tracking-tight">USSD code running...</span>
            </div>
          </motion.div>
        ) : ussdResult ? (
          <motion.div 
            key="ussd-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 bg-black/60 z-[95] flex items-center justify-center p-6"
          >
            <div className="bg-[#242426] w-full max-w-[340px] rounded-[1.8rem] overflow-hidden shadow-2xl">
              <div className="px-6 pt-8 pb-5">
                {/* --- Step: PIN Login --- */}
                {ussdStep === 'CBE_LOGIN_PIN' && (
                  <>
                    <p className="text-[#B8B8B8] text-[16.5px] leading-[1.6] mb-6 font-normal">
                      Welcome to CBE Mobile Banking. Please enter your PIN to login:
                    </p>
                    <div className="relative mb-1">
                      <input 
                        type="text" autoFocus 
                        value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-[18px] font-normal py-1 text-[#D1D1D1] caret-[#3B82F6]"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#3B82F6]" />
                    </div>
                  </>
                )}

                {/* --- Step: Main Menu --- */}
                {ussdStep === 'CBE_MAIN_MENU' && (
                  <>
                    <div className="text-[#B8B8B8] text-[15.5px] leading-[1.6] mb-6 font-normal whitespace-pre">
                      {"1:My Account\n2:Transfer to CBE Account\n3:Beneficiary\n4:Own Account Transfer\n5:Airtime\n6:Other Transfers\n7:CBEBirr\n8:Bills & Utilities\n9:Travel\n10:Next"}
                    </div>
                    <div className="relative mb-1">
                      <input 
                        type="text" autoFocus 
                        value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-[18px] font-normal py-1 text-[#D1D1D1] caret-[#3B82F6]"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#3B82F6]" />
                    </div>
                  </>
                )}

                {/* --- Step: Sender Name --- */}
                {ussdStep === 'CBE_SENDER_NAME' && (
                  <>
                    <p className="text-[#B8B8B8] text-[16.5px] leading-[1.6] mb-6 font-normal">
                      Enter Sender Name:
                    </p>
                    <div className="relative mb-1">
                      <input 
                        type="text" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-[18px] font-normal py-1 text-[#D1D1D1] caret-[#3B82F6]"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#3B82F6]" />
                    </div>
                  </>
                )}

                {/* --- Step: Receiver Name --- */}
                {ussdStep === 'CBE_RECEIVER_NAME' && (
                  <>
                    <p className="text-[#B8B8B8] text-[16.5px] leading-[1.6] mb-6 font-normal">
                      Enter Receiver Name:
                    </p>
                    <div className="relative mb-1">
                      <input 
                        type="text" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-[18px] font-normal py-1 text-[#D1D1D1] caret-[#3B82F6]"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#3B82F6]" />
                    </div>
                  </>
                )}

                {/* --- Step: Receiver Account --- */}
                {ussdStep === 'CBE_RECEIVER_ACCOUNT' && (
                  <>
                    <p className="text-[#B8B8B8] text-[16.5px] leading-[1.6] mb-6 font-normal">
                      Please enter account you want to transfer
                    </p>
                    <div className="relative mb-1">
                      <input 
                        type="text" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-[18px] font-normal py-1 text-[#D1D1D1] caret-[#3B82F6]"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#3B82F6]" />
                    </div>
                  </>
                )}

                {/* --- Step: Amount Entry --- */}
                {ussdStep === 'CBE_AMOUNT_ENTRY' && (
                  <>
                    <p className="text-[#B8B8B8] text-[16.5px] leading-[1.6] mb-6 font-normal whitespace-pre-wrap">
                      {ussdSessionData.senderName} ETB Education savin-0037 to {ussdSessionData.receiverName} ETB Saving Account-{ussdSessionData.receiverAcc.slice(-4)}{"\n"}
                      Enter Amount
                    </p>
                    <div className="relative mb-1">
                      <input 
                        type="text" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-[18px] font-normal py-1 text-[#D1D1D1] caret-[#3B82F6]"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#3B82F6]" />
                    </div>
                  </>
                )}

                {/* --- Step: Reason Entry --- */}
                {ussdStep === 'CBE_REASON_ENTRY' && (
                  <>
                    <p className="text-[#B8B8B8] text-[16.5px] leading-[1.6] mb-6 font-normal whitespace-pre-wrap">
                      {ussdSessionData.senderName} ETB Education savin 0037 to {ussdSessionData.receiverName} ETB Saving Account {ussdSessionData.receiverAcc.slice(-4)}{"\n"}
                      Amount:{ussdSessionData.amount}{"\n"}
                      Enter Reason
                    </p>
                    <div className="relative mb-1">
                      <input 
                        type="text" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-[18px] font-normal py-1 text-[#D1D1D1] caret-[#3B82F6]"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#3B82F6]" />
                    </div>
                  </>
                )}

                {/* --- Step: Final PIN --- */}
                {ussdStep === 'CBE_FINAL_PIN' && (
                  <>
                    <p className="text-[#B8B8B8] text-[16.5px] leading-[1.6] mb-6 font-normal whitespace-pre-wrap">
                      {ussdSessionData.senderName} ETB Education savin 0037 to {ussdSessionData.receiverName} ETB Saving Account {ussdSessionData.receiverAcc.slice(-4)}{"\n"}
                      Amount:{ussdSessionData.amount}{"\n"}
                      Remark:{ussdSessionData.reason}{"\n\n"}
                      Enter PIN to pay
                    </p>
                    <div className="relative mb-1">
                      <input 
                        type="text" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-[18px] font-normal py-1 text-[#D1D1D1] caret-[#3B82F6]"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#3B82F6]" />
                    </div>
                  </>
                )}

                {/* --- Step: Error Message --- */}
                {ussdStep === 'CBE_ERROR_MSG' && (
                  <div className="text-red-500 text-[17.5px] font-semibold leading-[1.6] mb-6 whitespace-pre-wrap">
                    {ussdResult}
                  </div>
                )}

                {/* --- Step: Success Message --- */}
                {ussdStep === 'CBE_SUCCESS' && (
                  <>
                    <p className="text-[#B8B8B8] text-[16.5px] leading-[1.6] mb-6 font-normal whitespace-pre-wrap">
                      Completed ETB{((ussdSessionData.amount || 0) + 0.61).toFixed(2)} transfer From {ussdSessionData.senderName} to {ussdSessionData.receiverName}-{ussdSessionData.receiverAcc.slice(-4)}. To {ussdSessionData.reason} on {getTodayDate()} {generateTxId()} Service Charge{"\n"}
                      #:Next
                    </p>
                    <div className="relative mb-1">
                      <input type="text" autoFocus className="w-full bg-transparent border-none outline-none text-[18px] font-normal py-1 text-[#D1D1D1] caret-[#3B82F6]" />
                      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#3B82F6]" />
                    </div>
                  </>
                )}

                {/* --- Step: Generic USSD --- */}
                {ussdStep === 'GENERIC' && (
                  <div className="text-[#B8B8B8] text-[17px] font-normal whitespace-pre-wrap leading-[1.6]">
                    {ussdResult}
                  </div>
                )}
              </div>

                {/* --- Nav Buttons --- */}
              <div className="flex border-t border-zinc-700/60 h-[3.4rem]">
                <button 
                  onClick={closeDialog}
                  className="flex-1 text-[#3B82F6] text-[1.15rem] font-medium active:bg-zinc-700/30 transition-colors"
                >
                  Cancel
                </button>
                <div className="flex items-center">
                  <div className="w-[1.2px] bg-zinc-700/50 h-5" />
                </div>
                <button 
                  onClick={ussdStep === 'CBE_SUCCESS' || ussdStep === 'GENERIC' || ussdStep === 'CBE_ERROR_MSG' ? closeDialog : handleUssdAction}
                  className="flex-1 text-[#3B82F6] text-[1.15rem] font-medium active:bg-zinc-700/30 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* --- Edit Call Modal --- */}
      <AnimatePresence>
        {editingCall && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-6 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#1C1C1E] w-full max-w-[320px] rounded-[2rem] overflow-hidden shadow-2xl border border-zinc-800"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Edit Call Info</h2>
                  <button onClick={() => setEditingCall(null)} className="text-zinc-500 active:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block px-1">Name</label>
                    <input 
                      type="text" 
                      value={editingCall.name}
                      onChange={(e) => setEditingCall({ ...editingCall, name: e.target.value })}
                      className="w-full bg-[#2C2C2E] border-none outline-none text-[17px] py-2 px-3 rounded-xl text-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block px-1">Number</label>
                    <input 
                      type="text" 
                      value={editingCall.number}
                      onChange={(e) => setEditingCall({ ...editingCall, number: e.target.value })}
                      className="w-full bg-[#2C2C2E] border-none outline-none text-[17px] py-2 px-3 rounded-xl text-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block px-1">Time</label>
                      <input 
                        type="text" 
                        value={editingCall.time}
                        onChange={(e) => setEditingCall({ ...editingCall, time: e.target.value })}
                        className="w-full bg-[#2C2C2E] border-none outline-none text-[17px] py-2 px-3 rounded-xl text-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block px-1">SIM</label>
                      <select 
                        value={editingCall.sim}
                        onChange={(e) => setEditingCall({ ...editingCall, sim: Number(e.target.value) as 1 | 2 })}
                        className="w-full bg-[#2C2C2E] border-none outline-none text-[17px] py-2 px-3 rounded-xl text-white focus:ring-1 focus:ring-blue-500 appearance-none"
                      >
                        <option value={1}>SIM 1</option>
                        <option value={2}>SIM 2</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block px-1">Type</label>
                    <div className="flex gap-2 p-1 bg-[#2C2C2E] rounded-xl">
                      {(['incoming', 'outgoing', 'missed'] as const).map(type => (
                        <button
                          key={type}
                          onClick={() => setEditingCall({ ...editingCall, type })}
                          className={`flex-1 py-1.5 rounded-lg text-[13px] capitalize transition-colors ${editingCall.type === type ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => {
                      setRecentCalls(prev => prev.filter(c => c.id !== editingCall.id));
                      setEditingCall(null);
                    }}
                    className="flex-1 bg-red-500/10 text-red-500 py-3 rounded-xl font-medium active:bg-red-500/20 transition-colors"
                  >
                    Delete
                  </button>
                  <button 
                    onClick={() => handleUpdateCall(editingCall)}
                    className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-medium active:bg-blue-600 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
